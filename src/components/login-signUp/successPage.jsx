import React from 'react';
import { Link } from 'react-router-dom';
import './successPage.css'


const SuccessPage = () => {
  
  return (
    <div className='main-container'>
        <span>Success</span><br />
        <Link to="/">
            Home
        </Link>
    </div>
  );
};

export default SuccessPage;
