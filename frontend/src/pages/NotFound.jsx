import React from 'react'
import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
     <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm max-w-2xl mx-auto mt-24">
      <h1 className="font-playfair text-8xl font-bold text-gray-200 animate-pulse-slow">404</h1>
      <h2 className="font-playfair text-2xl font-semibold text-gray-900 mt-4 tracking-tight">Page Not Found</h2>
      <p className="text-gray-500 mt-2 mb-8 font-light">The interview module you're looking for doesn't exist.</p>
      <Link to="/" className="inline-block bg-[#1B6C42] hover:bg-[#155A35] text-white px-8 py-3 rounded-full font-medium text-sm transition-all duration-300">
        Back to Dashboard
      </Link>
    </div>
  )
}

export default NotFound
