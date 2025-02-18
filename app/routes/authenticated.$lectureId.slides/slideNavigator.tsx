import { useRef, useEffect } from "react";
import { Link, useLocation } from "@remix-run/react";
import type { Lecture } from "~/models/lecture.server";

interface SlideData {
  base64: string;
  slideNumber: number;
}

interface SlideNavigatorProps {
  lectureId: Lecture["id"];
  slides: SlideData[];
  currentSlideNumber: number;
}

const SlideNavigator = ({
  lectureId,
  slides,
  currentSlideNumber,
}: SlideNavigatorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const location = useLocation();

  useEffect(() => {
    if (containerRef.current) {
      const slideElement = containerRef.current.querySelector(
        `[data-slide="${currentSlideNumber}"]`
      );
      if (slideElement) {
        slideElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [currentSlideNumber]);

  return (
    <div className="w-48 h-full flex flex-col bg-gray-100 border-r border-gray-200">
      <div className="p-3 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-700">Slides</h2>
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto py-2 space-y-2">
        {slides.map((slide, index) => (
          <Link
            key={index}
            to={{
              pathname: `/authenticated/${lectureId}/slides/${index + 1}`,
              search: location.search,
            }}
            data-slide={index + 1}
          >
            <div
              className={`mx-2 p-2 rounded-lg transition-colors ${
                currentSlideNumber === index + 1
                  ? "bg-blue-100 border-2 border-blue-500"
                  : "hover:bg-gray-200"
              }`}
            >
              <div className="relative pb-[56.25%] bg-white rounded shadow-sm overflow-hidden">
                <img
                  src={`data:image/png;base64,${slide.base64}`}
                  alt={`Slide ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 p-1 text-xs text-center bg-black bg-opacity-50 text-white">
                  {index + 1}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SlideNavigator;
