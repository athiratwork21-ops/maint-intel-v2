'use client'
import { useState, useRef, useEffect } from 'react'

export default function CustomDropdown({ 
  name,
  options, 
  defaultValue = '',
  value,
  onChange,
  placeholder = "Select...", 
  iconClass = ""
}: {
  name?: string,
  options: { value: string, label: string, icon?: string }[],
  defaultValue?: string,
  value?: string,
  onChange?: (val: string) => void,
  placeholder?: string,
  iconClass?: string
}) {
  // รองรับทั้งแบบใช้ State คุมเอง (Controlled) และแบบฟอร์มปกติ (Uncontrolled)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const currentValue = value !== undefined ? value : internalValue

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 🌟 ล็อกเป้า ESC และคลิกที่อื่นเพื่อปิด
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEsc)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen])

  const handleSelect = (val: string) => {
    setInternalValue(val)
    if (onChange) onChange(val)
    setIsOpen(false)
  }

  const selectedOption = options.find(opt => opt.value === currentValue)

  return (
    <div className="relative w-full" ref={dropdownRef}>
      
      {/* 🚨 เวทมนตร์อยู่ตรงนี้: ซ่อน Input ไว้ให้ formData ทำงานได้เหมือนเดิม! */}
      {name && <input type="hidden" name={name} value={currentValue} />}

      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-full p-4 bg-white border rounded-xl flex justify-between items-center transition-all shadow-sm ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 cursor-pointer' : 'border-slate-200 hover:border-blue-400 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          {iconClass && <i className={`${iconClass} text-slate-400 text-lg`}></i>}
          <span className={`font-bold text-sm truncate ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon && <i className={selectedOption.icon}></i>}
                {selectedOption.label}
              </span>
            ) : placeholder}
          </span>
        </div>
        <i className={`bi bi-chevron-down text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}></i>
      </div>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-100 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2 py-2 ring-1 ring-slate-900/5 max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-5 py-3 text-sm text-slate-400 text-center font-bold">ไม่มีข้อมูล</div>
          ) : (
            options.map((opt) => (
              <div 
                key={opt.value} 
                onClick={() => handleSelect(opt.value)} 
                className={`px-5 py-3.5 cursor-pointer font-bold text-sm transition-all flex items-center gap-3 ${
                  currentValue === opt.value ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                {opt.icon && <i className={`${opt.icon} text-lg`}></i>}
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
