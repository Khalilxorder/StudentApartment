
export default function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="border rounded overflow-hidden">
      <iframe
        width="100%"
        height="250"
        loading="lazy"
        allowFullScreen
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
      ></iframe>
    </div>
  );
}
