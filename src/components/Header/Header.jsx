import React from "react";
import "./Header.css";
import logo from "../../assets/header/food.svg";
import background from "../../assets/header/header-bg.png";
import Image from "next/image";
const Header = () => {
  return (
    <div className="Header">
      <div className="title">
        Kaha
        <Image className="logo" width={53} height={53} src={logo} alt="logo" />
      </div>
      <div className="title-2">CHALEIN?</div>
      <Image className="background" src={background} alt="logo" />
    </div>
  );
};

export default Header;
