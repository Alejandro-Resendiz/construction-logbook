import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import argparse
from datetime import datetime, time, timedelta
import re

def parse_date(date_str):
    # Map "13-3" to "2026-03-13"
    day, month = date_str.split('-')
    return f"2026-{int(month):02d}-{int(day):02d}"

def clean_currency(curr_str):
    if pd.isna(curr_str) or curr_str == '':
        return 0.0
    return float(re.sub(r'[^\d.]', '', str(curr_str)))

def populate_logs(connection_string, csv_path):
    conn = psycopg2.connect(connection_string)
    cur = conn.cursor()

    print("Ensuring DEFAULT project exists...")
    cur.execute("INSERT INTO projects (project_name) VALUES ('DEFAULT') ON CONFLICT (project_name) DO NOTHING")
    cur.execute("SELECT project_id FROM projects WHERE project_name = 'DEFAULT'")
    default_project_id = cur.fetchone()[0]

    print("Fetching machinery and projects...")
    cur.execute("SELECT external_code, machinery_id FROM machinery")
    machinery_map = {row[0]: row[1] for row in cur.fetchall()}

    cur.execute("SELECT LOWER(project_name), project_id FROM projects")
    projects_map = {row[0]: row[1] for row in cur.fetchall()}

    print(f"Reading CSV: {csv_path}")
    df = pd.read_csv(csv_path)

    logs_to_insert = []
    
    for _, row in df.iterrows():
        ext_code = str(row['ID DE MÁQUINA']).strip()
        machine_id = machinery_map.get(ext_code)
        
        if not machine_id:
            print(f"Warning: Machine with code {ext_code} not found. Skipping.")
            continue

        raw_date = str(row['FECHA']).strip()
        log_date = parse_date(raw_date)
        
        raw_project = str(row['PROYECTO']).strip()
        project_id = projects_map.get(raw_project.lower())
        observations = None
        
        if not project_id:
            project_id = default_project_id
            observations = f"Proyecto: {raw_project}"

        operator = str(row['OPERADOR']).strip()
        hours = float(row['HORAS TRABAJADAS REALES REGISTRADAS'])
        fuel_liters = float(row['LITROS CONSUMIDOS REALES'])
        fuel_price = clean_currency(row['$/L'])

        start_time = time(0, 0)
        # Calculate end_time by adding hours to start_time
        # Since start_time is 12:00 AM, we just convert hours to a time object
        end_dt = datetime.combine(datetime.today(), start_time) + timedelta(hours=hours)
        end_time = end_dt.time()

        logs_to_insert.append((
            machine_id,
            project_id,
            log_date,
            operator,
            start_time,
            end_time,
            fuel_liters,
            fuel_price,
            observations,
            True # is_completed = True for historical logs
        ))

    print(f"Inserting {len(logs_to_insert)} logs...")
    query = """
        INSERT INTO machinery_logs (
            machine_id, project_id, date, operator_name, 
            start_time, end_time, fuel_liters, fuel_price, 
            observations, is_completed
        ) VALUES %s
    """
    execute_values(cur, query, logs_to_insert)

    conn.commit()
    cur.close()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Populate machinery logs from CSV')
    parser.add_argument('--conn', required=True, help='Postgres connection string')
    parser.add_argument('--csv', default='data/prod/week1.csv', help='Path to CSV file')
    
    args = parser.parse_args()
    populate_logs(args.conn, args.csv)
