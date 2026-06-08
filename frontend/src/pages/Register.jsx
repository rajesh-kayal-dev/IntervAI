import {useState,useEffect} from 'react'
import {useSelector,useDispatch} from 'react-redux'
import {register,reset} from '../features/auth/authSlice'
import { useNavigate,Link } from 'react-router-dom'
import {toast} from 'react-toastify'



const Register = () => {

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password2: ''
  })

  const {name,email,password,password2} = formData

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const {user,isLoading,isError,isSuccess,message} = useSelector((state) => state.auth)

  useEffect(() => {
    if(isError){
      toast.error(message)
      dispatch(reset())
    }
    if(isSuccess ){
      toast.success('User Registered Successfully')
      navigate('/')
      dispatch(reset())
    }
    if(user && !isSuccess){
      navigate('/')
      
    }
  }, [user,isError,isSuccess,message,navigate,dispatch])


  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value
    }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if(password !== password2){
      toast.error('Passwords do not match')
    }else{
      const userData = {
        name,
        email,
        password
      }
      dispatch(register(userData))
    }
  }

  if(isLoading){
    return(
      <div className='flex justify-center items-center h-screen'>
      <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500'></div>
      </div>
    )
  }

  return (
    <div className='flex justify-center items-center min-h-[95vh] px-4 sm:px-6 py-16 mt-12'>
      <div className='w-full max-w-md bg-white rounded-3xl border border-gray-200 shadow-2xl p-8 sm:p-10 relative overflow-hidden transition-all duration-350'>
        <div className='text-center mb-6'>
          <h2 className='font-playfair text-3xl font-semibold text-[#111827] tracking-tight'>Get Started</h2>
          <p className='text-gray-500 text-sm mt-2 font-light'>
            Join developers practicing with IntervAI
          </p>
        </div>

        <form onSubmit={onSubmit} className='space-y-4'>
          <div className='space-y-1'>
            <label className='text-xs font-semibold text-gray-500 ml-1'>Full Name</label>
            <input 
              type="text" 
              name="name" 
              value={name} 
              className='bg-gray-50 border border-gray-200 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 w-full outline-none transition-all text-sm' 
              placeholder='Siddhant Saxena' 
              onChange={onChange} 
              required 
            />
          </div>

          <div className='space-y-1'>
            <label className='text-xs font-semibold text-gray-500 ml-1'>Email Address</label>
            <input 
              type="email" 
              name="email" 
              value={email} 
              className='bg-gray-50 border border-gray-200 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 w-full outline-none transition-all text-sm' 
              placeholder='siddhant@gmail.com' 
              onChange={onChange} 
              required 
            />
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1'>
              <label className='text-xs font-semibold text-gray-500 ml-1'>Password</label>
              <input 
                type="password" 
                name="password" 
                value={password} 
                className='bg-gray-50 border border-gray-200 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 w-full outline-none transition-all text-sm' 
                placeholder='********' 
                onChange={onChange} 
                required 
              />
            </div>
            <div className='space-y-1'>
              <label className='text-xs font-semibold text-gray-500 ml-1'>Confirm Password</label>
              <input 
                type="password" 
                name="password2" 
                value={password2} 
                className='bg-gray-50 border border-gray-200 focus:border-[#1B6C42] focus:ring-2 focus:ring-[#1B6C42]/20 rounded-xl px-4 py-3 text-[#111827] placeholder:text-gray-400 w-full outline-none transition-all text-sm' 
                placeholder='********' 
                onChange={onChange} 
                required 
              />
            </div>
          </div>

          <button 
            type="submit" 
            className='w-full bg-[#1B6C42] text-white py-3.5 rounded-xl font-medium text-sm hover:bg-[#155A35] shadow-sm transition-all duration-300 mt-6 active:scale-[0.98]'
          >
            Create My Account
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500 font-light">
          Already have an account? <Link to="/login" className="text-[#1B6C42] font-semibold hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
