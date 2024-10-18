import { PiggyBank } from 'lucide-react'
import React from 'react'

function Logo() {
  return <a href='/' className='flex items-center gap-2'>
    <PiggyBank className='stroke h-11 w-11 stroke-indigo-500 stroke-[1.5]' />
    <p className="bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-3xl font-bold leading-tight tracking-tighter text-transparent">
        Budgetly
    </p>
  </a>
}

export function LogoMobile() {
    return <a href='/' className='flex items-center gap-2'>
      <p className="bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-3xl font-bold leading-tight tracking-tighter text-transparent">
          Budgetly
      </p>
    </a>
}

export default Logo