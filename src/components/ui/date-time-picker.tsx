"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  disabled?: boolean
}

function DateTimePicker({
  value,
  onChange,
  className,
  disabled = false,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse datetime-local format: YYYY-MM-DDTHH:mm
  const { dateValue, timeValue } = React.useMemo(() => {
    if (!value) return { dateValue: undefined, timeValue: "" }

    const [datePart, timePart] = value.split('T')
    const parsed = parse(datePart, 'yyyy-MM-dd', new Date())

    return {
      dateValue: isNaN(parsed.getTime()) ? undefined : parsed,
      timeValue: timePart || ""
    }
  }, [value])

  const handleDateSelect = (date: Date | undefined) => {
    if (date && onChange) {
      const dateStr = format(date, 'yyyy-MM-dd')
      const time = timeValue || '00:00'
      onChange(`${dateStr}T${time}`)
    }
    setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      const dateStr = dateValue ? format(dateValue, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      onChange(`${dateStr}T${e.target.value}`)
    }
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "flex-1 justify-between font-normal",
              !dateValue && "text-muted-foreground"
            )}
          >
            {dateValue ? dateValue.toLocaleDateString() : "Select date"}
            <ChevronDownIcon className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={dateValue}
            captionLayout="dropdown"
            onSelect={handleDateSelect}
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        disabled={disabled}
        value={timeValue}
        onChange={handleTimeChange}
        className="w-[120px] bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
      />
    </div>
  )
}

export { DateTimePicker }
