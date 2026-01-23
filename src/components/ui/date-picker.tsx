"use client"

import * as React from "react"
import { format, parse } from "date-fns"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string | Date
  onChange?: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

function DatePicker({
  value,
  onChange,
  className,
  placeholder = "Select date",
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse value to Date object
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    // Handle YYYY-MM-DD format
    const parsed = parse(value.split('T')[0], 'yyyy-MM-dd', new Date())
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    if (date && onChange) {
      // Format as YYYY-MM-DD to match the original input type="date" format
      onChange(format(date, 'yyyy-MM-dd'))
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !dateValue && "text-muted-foreground",
            className
          )}
        >
          {dateValue ? dateValue.toLocaleDateString() : placeholder}
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          captionLayout="dropdown"
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
