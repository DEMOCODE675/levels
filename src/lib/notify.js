import toast from 'react-hot-toast'

const baseStyle = {
  borderRadius: '12px',
  border: '1px solid rgba(155, 142, 199, 0.35)',
  background: '#fffdf5',
  color: '#463f62',
  boxShadow: '0 10px 25px rgba(81, 67, 127, 0.15)',
  padding: '14px 16px',
  fontWeight: 600,
  maxWidth: '420px',
  fontSize: '14px',
  zIndex: 9999,
}

export const notify = {
  success(message) {
    toast.success(message, {
      duration: 3500,
      iconTheme: {
        primary: '#9B8EC7',
        secondary: '#FFF1CB',
      },
      style: {
        ...baseStyle,
      },
    })
  },

  error(message) {
    toast.error(message, {
      duration: 4000,
      iconTheme: {
        primary: '#FF8F8F',
        secondary: '#FFF1CB',
      },
      style: {
        ...baseStyle,
        border: '1px solid rgba(255, 143, 143, 0.5)',
      },
    })
  },

  info(message) {
    toast(message, {
      duration: 3000,
      icon: 'i',
      style: {
        ...baseStyle,
        border: '1px solid rgba(155, 142, 199, 0.4)',
      },
    })
  },
}
