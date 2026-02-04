import EmailItem from "@/components/email/EmailItem";

export default function ReadyToSell() {
  return (
    <div className="h-full overflow-y-auto">
      {Array.from({ length: 20 }).map((_, i) => (
        <EmailItem key={i} subject={`Lead ${i}`} sender="sales@mail.com" tag="important" />
      ))}
    </div>
  );
}
