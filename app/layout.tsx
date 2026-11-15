import './style.css';
export const metadata={title:'GRIM — Play. Watch. Escape.',description:'A quiet space for extraordinary games and independent film.',icons:{icon:'/grimai-icon.png',apple:'/grimai-logo.webp'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
