import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as HotToaster } from 'react-hot-toast'

function App() {
  return (
    <>
      <Pages />
      <Toaster />
      <HotToaster position="bottom-right" />
    </>
  )
}

export default App 