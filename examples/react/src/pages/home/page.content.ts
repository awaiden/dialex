import { defineDictionary } from "dialex";

export default defineDictionary("home", {
  en: {
    title: "Welcome to the Dashboard",
    subtitle: "Your overview of recent activities.",
    card: {
      title: "User Statistics",
      description: "Here you can find your latest user statistics and notifications.",
    },
    greeting: (name: string) => `Hello, ${name}! It's great to see you again.`,
    stats: (count: number) => `You have ${count} unread notifications.`,
  },
  tr: {
    title: "Kontrol Paneline Hoş Geldiniz",
    subtitle: "Son etkinliklerinize genel bakış.",
    card: {
      title: "Kullanıcı İstatistikleri",
      description: "Burada en son kullanıcı istatistiklerinizi ve bildirimlerinizi bulabilirsiniz.",
    },
    greeting: (name: string) => `Merhaba, ${name}! Sizi tekrar görmek harika.`,
    stats: (count: number) => `${count} okunmamış bildiriminiz var.`,
  },
});
