import './index.css'
import Layout from './components/Layout'
import TimerProvider from './components/TimerProvider'

function App() {
  return (
    <TimerProvider>
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Words on Phone</h1>
        <Layout />
      </div>
    </TimerProvider>
  )
}

export default App
