'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); 
    }
  }, [isSearchOpen]);

  return (
    <nav className="bg-[#0f0f0f] border-b border-[#272727] sticky top-0 z-50">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* ========================================== */}
          {/* 1. โลโก้ (ซ้าย) */}
          {/* ========================================== */}
          <div className="flex-shrink-0">
            <Link href="/search" className="flex items-center gap-3 text-[#f1f1f1] hover:text-white transition-colors group">
              <div className="flex items-center justify-center w-11 h-7 bg-transparent border-2 border-blue-500 rounded-lg group-hover:border-blue-400 transition-colors shadow-sm">
                <i className="bi bi-tools text-blue-500 group-hover:text-blue-400 text-sm transition-colors"></i>
              </div>
              <span className="font-bold text-xl hidden sm:block tracking-tight font-sans">Maintenance Intelligence</span>
              <span className="font-bold text-xl sm:hidden tracking-tight font-sans">Maint-Intel</span>
            </Link>
          </div>

          {/* ========================================== */}
          {/* 2. เมนูฝั่งขวา (ค้นหา Slide-out + ปุ่มอัปโหลด) */}
          {/* ========================================== */}
          <div className="flex items-center gap-2 md:gap-4">
            
            {/* กล่องค้นหา (แก้บั๊กเส้นๆ ด้วย border สีใส และ overflow-hidden) */}
            <form 
              action="/search" 
              method="GET"
              className={`relative transition-all duration-500 ease-in-out h-10 rounded-full overflow-hidden border ${
                isSearchOpen 
                  ? 'w-[220px] sm:w-[350px] bg-[#121212] border-[#303030] shadow-inner' 
                  : 'w-10 bg-transparent border-transparent'
              }`}
            >
              {/* ช่องพิมพ์ (เพิ่ม whitespace-nowrap และลบ outline/border เบราว์เซอร์ทิ้งให้หมด) */}
              <input
                ref={inputRef}
                type="text"
                name="q"
                placeholder="ค้นหารหัส Alarm, อาการเสีย..."
                autoComplete="off"
                className={`absolute left-0 top-0 bottom-0 bg-transparent text-[#f1f1f1] text-[15px] whitespace-nowrap border-none outline-none focus:outline-none focus:ring-0 shadow-none transition-all duration-500 ease-in-out ${
                  isSearchOpen ? 'w-[calc(100%-40px)] opacity-100 pl-4 pr-1' : 'w-0 opacity-0 px-0 pointer-events-none'
                }`}
                onBlur={() => {
                  setTimeout(() => {
                    if (!inputRef.current?.value) {
                      setIsSearchOpen(false);
                    }
                  }, 200);
                }}
              />

              {/* ปุ่มแว่นขยาย (เพิ่ม rounded-full กันสีพื้นหลังเหลี่ยมโผล่) */}
              <button
                type={isSearchOpen ? "submit" : "button"} 
                onClick={(e) => {
                  if (!isSearchOpen) {
                    e.preventDefault(); 
                    setIsSearchOpen(true);
                  }
                }}
                className={`absolute right-0 top-0 bottom-0 h-10 w-10 flex items-center justify-center shrink-0 rounded-full text-[#f1f1f1] hover:text-white transition-colors ${
                  isSearchOpen ? 'text-[#aaaaaa] hover:bg-[#272727]' : 'hover:bg-[#272727]'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </button>
            </form>

            {/* ปุ่มอัปโหลด */}
            <Link 
              href="/melearn"
              className="px-4 py-2.5 rounded-full text-sm font-medium bg-[#272727] text-[#f1f1f1] hover:bg-blue-600 transition-all flex items-center gap-2 border border-[#303030] hover:border-blue-500 shrink-0 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              <span className="hidden sm:block">อัปโหลด</span>
            </Link>

          </div>

        </div>
      </div>
    </nav>
  );
}