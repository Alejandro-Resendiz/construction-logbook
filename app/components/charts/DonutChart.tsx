'use client'

import React, { useMemo, useCallback } from 'react'
import Pie from '@visx/shape/lib/shapes/Pie'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleOrdinal } from '@visx/scale'
import { LegendOrdinal, LegendItem } from '@visx/legend'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { localPoint } from '@visx/event'

const tooltipStyles = {
  ...defaultStyles,
  minWidth: 60,
  backgroundColor: 'rgba(0,0,0,0.9)',
  color: 'white',
  padding: '8px',
  fontSize: '12px',
  borderRadius: '4px',
}

interface DataItem {
  label: string
  value: number
  name?: string
}

interface DonutChartProps {
  data: DataItem[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
}

const colors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6'
]

function DonutChartContent({
  data,
  width,
  height,
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
}: DonutChartProps) {
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<DataItem>()

  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom
  const radius = Math.min(innerWidth, innerHeight) / 2
  const centerY = innerHeight / 2
  const centerX = innerWidth / 2
  const donutThickness = 40

  const colorScale = useMemo(
    () =>
      scaleOrdinal({
        domain: data.map((d) => d.label),
        range: colors,
      }),
    [data]
  )

  const handleMouseOver = useCallback(
    (event: React.MouseEvent | React.TouchEvent, datum: DataItem) => {
      const coords = localPoint(event)
      if (!coords) return
      showTooltip({
        tooltipData: datum,
        tooltipLeft: coords.x,
        tooltipTop: coords.y,
      })
    },
    [showTooltip]
  )

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height}>
        <Group top={centerY + margin.top} left={centerX + margin.left}>
          <Pie
            data={data}
            pieValue={(d) => d.value}
            outerRadius={radius}
            innerRadius={radius - donutThickness}
            cornerRadius={3}
            padAngle={0.005}
          >
            {(pie) => {
              return pie.arcs.map((arc, index) => {
                const datum = arc.data
                const { label } = datum
                return (
                  <g key={`arc-${label}-${index}`}>
                    <path 
                      d={pie.path(arc) || ''} 
                      fill={colorScale(label)} 
                      onMouseMove={(event) => handleMouseOver(event, datum)}
                      onMouseLeave={() => hideTooltip()}
                      className="transition-opacity hover:opacity-80 cursor-pointer"
                    />
                  </g>
                )
              })
            }}
          </Pie>
        </Group>
      </svg>
      
      {/* Basic Legend */}
      <div className="absolute top-0 right-0 p-2 overflow-y-auto max-h-full">
        <LegendOrdinal scale={colorScale}>
          {(labels) => (
            <div className="flex flex-col gap-1">
              {labels.map((label, i) => (
                <LegendItem key={`legend-${i}`} margin="0 5px">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: label.value }} 
                    />
                    <div className="text-[10px] font-bold text-gray-600 truncate max-w-[100px]">
                      {label.text}
                    </div>
                  </div>
                </LegendItem>
              ))}
            </div>
          )}
        </LegendOrdinal>
      </div>

      {tooltipData && (
        <TooltipWithBounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
          style={tooltipStyles}
        >
          <div className="font-bold border-b border-gray-700 mb-1 pb-1">
            {tooltipData.name || tooltipData.label}
          </div>
          <div>{tooltipData.value.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</div>
        </TooltipWithBounds>
      )}
    </div>
  )
}

export default function ResponsiveDonutChart(props: Omit<DonutChartProps, 'width' | 'height'>) {
  return (
    <ParentSize>
      {({ width, height }) => (
        <DonutChartContent width={width} height={height || 300} {...props} />
      )}
    </ParentSize>
  )
}
