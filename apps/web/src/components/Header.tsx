import React from 'react'
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import "../customstyle.css"
import HomeFilledIcon from '@mui/icons-material/HomeFilled';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
    const navigate=useNavigate()
    const { t } = useTranslation();
  return (
    <header
    className="
    font-bold text-4xl
      relative w-screen overflow-hidden text-white
      ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] bg-primary text-whitex flex content-center
    "
  >
    <div className="mx-auto flex flex-col gap-5 max-w-6xl items-center justify-between px-4 py-6 ">
      <h1 className="text-3xl text-white font-semibold tracking-tight">{t('header.title')}</h1>
      <div className='flex gap-5 items-center' >
        <HomeFilledIcon  onClick={()=>navigate("/")}   fontSize="large" className='!text-4xl cursor-pointer' />  
        <QrCode2Icon className="!text-4xl cursor-pointer" onClick={()=>navigate("/scan")}  />
        <LanguageSwitcher />
      </div>
    </div>
  
   
    <div
      aria-hidden
      className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[120vw] -translate-x-1/2 rounded-[50%]"
    />
  </header>
  )
}

export default Header
