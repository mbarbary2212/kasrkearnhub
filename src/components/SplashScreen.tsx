interface SplashScreenProps {
  onDismiss: () => void;
}

export default function SplashScreen({ onDismiss }: SplashScreenProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] bg-white p-2 md:p-3 cursor-pointer animate-fade-in"
      onClick={onDismiss}
    >
      {/* Desktop/Tablet: Nearly full-screen image with thin white frame */}
      <div className="hidden md:block relative w-full h-full rounded-lg overflow-hidden shadow-lg">
        <img
          src="/splash-landscape.jpeg"
          alt="KALM Hub"
          className="w-full h-full object-cover"
        />
        <button
          className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 bg-primary text-primary-foreground rounded-full text-lg font-medium hover:bg-primary/90 transition-colors shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          Click here to log in
        </button>
      </div>

      {/* Mobile: Nearly full-screen portrait image with thin white frame */}
      <div className="md:hidden relative w-full h-full rounded-lg overflow-hidden shadow-lg">
        <img
          src="/splash-portrait.jpeg"
          alt="KALM Hub"
          className="w-full h-full object-cover"
        />
        <button
          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-primary text-primary-foreground rounded-full text-base font-medium hover:bg-primary/90 transition-colors shadow-md"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          Click here to log in
        </button>
      </div>
    </div>
  );
}
