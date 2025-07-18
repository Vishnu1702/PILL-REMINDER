import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import './index.css'
import MedicineReminderApp from './MedicineReminderApp'

function App() {
  return (
    <>
      <div className="fixed inset-0 flex flex-col items-stretch justify-start bg-gradient-to-tr from-purple-300 to-purple-600">

          <MedicineReminderApp />

      </div>
    </>
  )
}

export default App
