'use client'

import React, { useMemo, useCallback } from 'react'
import { Group } from '@visx/group'
import { Bar } from '@visx/shape'
import { scaleBand, scaleLinear } from '@visx/scale'
import { AxisBottom, AxisLeft } from '@visx/axis'
import { ParentSize } from '@visx/responsive'
import { useTooltip, TooltipWithBounds, defaultStyles } from '@visx/tooltip'
import { localPoint } from '@visx/event'
import { GridRows } from '@visx/grid'

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

interface BarChartProps {
  data: DataItem[]
  width: number
  height: number
  margin?: { top: number; right: number; bottom: number; left: number }
  color?: string
  yAxisLabel?: string
}

function BarChartContent({
  data,
  width,
  height,
  margin = { top: 20, right: 20, bottom: 60, left: 60 },
  color = '#3b82f6',
  yAxisLabel,
}: BarChartProps) {
  const {
    showTooltip,
    hideTooltip,
    tooltipData,
    tooltipLeft,
    tooltipTop,
  } = useTooltip<DataItem>()

  // Bounds
  const xMax = width - margin.left - margin.right
  const yMax = height - margin.top - margin.bottom

  // Scales
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        range: [0, xMax],
        round: true,
        domain: data.map((d) => d.label),
        padding: 0.4,
      }),
    [xMax, data]
  )

  const yScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        round: true,
        domain: [0, Math.max(...data.map((d) => d.value)) * 1.1 || 10],
      }),
    [yMax, data]
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
    <div className="relative">
      <svg width={width} height={height}>
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={yScale} width={xMax} height={yMax} stroke="#e5e7eb" />
          <AxisBottom
            top={yMax}
            scale={xScale}
            stroke="#374151"
            tickStroke="#374151"
            tickLabelProps={() => ({
              fill: '#374151',
              fontSize: 10,
              textAnchor: 'middle',
              angle: data.length > 5 ? -45 : 0,
              dy: data.length > 5 ? '0.5em' : '0em',
            })}
          />
          <AxisLeft
            scale={yScale}
            stroke="#374151"
            tickStroke="#374151"
            label={yAxisLabel}
            tickLabelProps={() => ({
              fill: '#374151',
              fontSize: 10,
              textAnchor: 'end',
              dx: '-0.25em',
              dy: '0.25em',
            })}
          />
          {data.map((d) => {
            const barWidth = xScale.bandwidth()
            const barHeight = yMax - (yScale(d.value) ?? 0)
            const barX = xScale(d.label)
            const barY = yMax - barHeight
            return (
              <Bar
                key={`bar-${d.label}`}
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx={4}
                onMouseMove={(event) => handleMouseOver(event, d)}
                onMouseLeave={() => hideTooltip()}
              />
            )
          })}
        </Group>
      </svg>
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
          {tooltipData.name && (
            <div className="text-[10px] text-gray-400 mb-1">{tooltipData.label}</div>
          )}
          <div>{tooltipData.value.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</div>
        </TooltipWithBounds>
      )}
    </div>
  )
}

export default function ResponsiveBarChart(props: Omit<BarChartProps, 'width' | 'height'>) {
  return (
    <ParentSize>
      {({ width, height }) => (
        <BarChartContent width={width} height={height || 300} {...props} />
      )}
    </ParentSize>
  )
}
