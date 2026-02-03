interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center cursor-pointer animate-fade-in"
      onClick={onDismiss}
    >
      {/* Desktop/Tablet: Centered image with white frame */}
      <div className="hidden md:flex flex-col items-center justify-center flex-1 w-full p-8 lg:p-12">
        <div className="relative max-w-5xl w-full max-h-[70vh] rounded-lg overflow-hidden shadow-lg">
          <img
            src="/splash-landscape.jpeg"
            alt="KALM Hub"
            className="w-full h-full object-contain"
          />
        </div>
        <button
          className="mt-8 px-8 py-3 bg-primary text-primary-foreground rounded-full text-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          Click here to log in
        </button>
      </div>

      {/* Mobile: Full-width portrait image */}
      <div className="flex md:hidden flex-col items-center justify-center flex-1 w-full">
        <div className="flex-1 w-full flex items-center justify-center p-4">
          <img
            src="/splash-portrait.jpeg"
            alt="KALM Hub"
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
          />
        </div>
        <div className="pb-8 pt-4">
          <button
            className="px-6 py-3 bg-primary text-primary-foreground rounded-full text-base font-medium hover:bg-primary/90 transition-colors shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
          >
            Click here to log in
          </button>
        </div>
      </div>
    </div>
  );
}
