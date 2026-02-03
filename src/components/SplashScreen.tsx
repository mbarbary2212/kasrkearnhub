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
          className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3 bg-white/10 backdrop-blur-sm border border-white text-white rounded-full text-lg font-medium hover:bg-white/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          Click to log in
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
          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white text-white rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          Click to log in
        </button>
      </div>
    </div>
  );
}
