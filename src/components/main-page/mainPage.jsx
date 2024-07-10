import React from 'react';
import { Link } from 'react-router-dom';



const MainPage = () => {
  
  return (
    <div className='main-container'>
        <span>Main page</span><br />
        <Link to="/">
            Sign out
        </Link>
    </div>
  );
};

export default MainPage;
