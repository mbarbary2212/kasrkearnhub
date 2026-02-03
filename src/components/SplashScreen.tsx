interface SplashScreenProps {
  isFading: boolean;
}

export default function SplashScreen({ isFading }: SplashScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-[9999] bg-background transition-opacity duration-500 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <picture className="w-full h-full">
        <source
          media="(max-width: 767px)"
          srcSet="/splash-portrait.jpeg"
        />
        <source
          media="(min-width: 768px)"
          srcSet="/splash-landscape.jpeg"
        />
        <img
          src="/splash-landscape.jpeg"
          alt="KALM Hub"
          className="w-full h-full object-cover"
        />
      </picture>
    </div>
  );
}
