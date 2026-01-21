import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

// Export SwiperSlide so it can be used in App.js
export { SwiperSlide };

const SwiperComponent = ({ children, ...props }) => {
  return (
    <Swiper
      modules={[Navigation, Pagination]}
      spaceBetween={0}
      slidesPerView={1}
      navigation
      pagination={{ clickable: true }}
      {...props}
    >
      {children}
    </Swiper>
  );
};

export default SwiperComponent;
