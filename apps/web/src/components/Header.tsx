import React from 'react'
import "../customstyle.css"
const Header = () => {
  return (
    <header
    className="
      relative w-screen overflow-hidden text-white
      ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] header flex content-center
    "
  >
    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 ">
      <h1 className="text-2xl font-semibold tracking-tight">Door Meen</h1>
      
    </div>
  
   
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[120vw] -translate-x-1/2 rounded-[50%]"
    />
  </header>
  )
}

export default Header
