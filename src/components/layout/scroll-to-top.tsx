import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function ScrollToTop() {
const { pathname, hash } = useLocation()

useEffect(() => {
if (hash) {
const target = document.getElementById(decodeURIComponent(hash.slice(1)))

if (target) {
const reduceMotion = window.matchMedia(
'(prefers-reduced-motion: reduce)',
).matches

target.scrollIntoView({
behavior: reduceMotion ? 'auto' : 'smooth',
block: 'start',
})
return
}
}

window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}, [pathname, hash])

return null
}

export { ScrollToTop }
