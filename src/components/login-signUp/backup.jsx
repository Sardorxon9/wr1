import React from 'react';
import './registrationOwner.css';

const RegistrationOwner = () => {
  return (
    <div className="main-container">
      <div className="left-container">
        <div className="signup-container">
          <h2 className="signup-text">Регистрация</h2>
          <form>
            <div className="signup-info">
              <div className="signup-field">
                <label>Имя <span className="required">*</span></label>
                <input type="text" placeholder="Ваше имя" />
              </div>
              <div className="signup-field">
                <label>Фамилия <span className="required">*</span></label>
                <input type="text" placeholder="Ваша фамилия" />
              </div>
              <div className="signup-field">
                <label>Email <span className="required">*</span></label>
                <input type="email" placeholder="email" />
              </div>
              <div className="signup-field">
                <label>Пароль <span className="required">*</span></label>
                <input type="password" placeholder="Ваше имя" />
              </div>
              <div className="signup-field">
                <label>Повторите пароль <span className="required">*</span></label>
                <input type="password" placeholder="Ваше фамилия" />
              </div>
              <div className="signup-field">
                <label>Организация <span className="required">*</span></label>
                <input type="text" placeholder="email" />
              </div>
            </div>
            <button type="submit" className="signup-button">Регистрация</button>
          </form>
        </div>
      </div>
      <div className="right-container"></div>
    </div>
  );
};

export default RegistrationOwner;
