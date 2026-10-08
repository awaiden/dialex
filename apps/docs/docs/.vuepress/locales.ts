/**
 * Everything on the site that is not a Markdown page: the language list, navigation labels, the
 * theme's built-in strings, and the search placeholder. Page content lives in `docs/<code>/`.
 */

export type LocaleCode = "en" | "tr" | "es" | "de" | "zh";

export interface SiteLocale {
  /** URL prefix; `/` for the default language. */
  prefix: string;
  lang: string;
  /** Language name shown in the language picker, in that language. */
  name: string;
  description: string;
  searchPlaceholder: string;
  nav: { guide: string; frameworks: string; cli: string; api: string };
  theme: {
    selectLanguageText: string;
    selectLanguageAriaLabel: string;
    editLinkText: string;
    lastUpdatedText: string;
    contributorsText: string;
    tip: string;
    warning: string;
    danger: string;
    important: string;
    note: string;
    notFound: string[];
    backToHome: string;
    openInNewWindow: string;
    toggleColorMode: string;
    toggleSidebar: string;
    prev: string;
    next: string;
  };
}

export const LOCALES: Record<LocaleCode, SiteLocale> = {
  en: {
    prefix: "/",
    lang: "en-US",
    name: "English",
    description: "Type-safe, zero-runtime-overhead internationalization for the full stack.",
    searchPlaceholder: "Search",
    nav: { guide: "Guide", frameworks: "Frameworks", cli: "CLI", api: "API" },
    theme: {
      selectLanguageText: "Languages",
      selectLanguageAriaLabel: "Select language",
      editLinkText: "Edit this page",
      lastUpdatedText: "Last Updated",
      contributorsText: "Contributors",
      tip: "TIP",
      warning: "WARNING",
      danger: "DANGER",
      important: "IMPORTANT",
      note: "NOTE",
      notFound: [
        "There's nothing here.",
        "How did we get here?",
        "That's a Four-Oh-Four.",
        "Looks like we've got some broken links.",
      ],
      backToHome: "Take me home",
      openInNewWindow: "open in new window",
      toggleColorMode: "toggle color mode",
      toggleSidebar: "toggle sidebar",
      prev: "Prev",
      next: "Next",
    },
  },
  tr: {
    prefix: "/tr/",
    lang: "tr-TR",
    name: "Türkçe",
    description: "Tam yığın için tip güvenli, çalışma zamanı yükü olmayan uluslararasılaştırma.",
    searchPlaceholder: "Ara",
    nav: { guide: "Kılavuz", frameworks: "Çerçeveler", cli: "CLI", api: "API" },
    theme: {
      selectLanguageText: "Diller",
      selectLanguageAriaLabel: "Dil seçin",
      editLinkText: "Bu sayfayı düzenle",
      lastUpdatedText: "Son güncelleme",
      contributorsText: "Katkıda bulunanlar",
      tip: "İPUCU",
      warning: "UYARI",
      danger: "TEHLİKE",
      important: "ÖNEMLİ",
      note: "NOT",
      notFound: [
        "Burada hiçbir şey yok.",
        "Sayfa bulunamadı.",
        "Bağlantı bozuk görünüyor.",
        "404 Sayfa bulunamadı",
      ],
      backToHome: "Ana sayfaya dön",
      openInNewWindow: "yeni pencerede aç",
      toggleColorMode: "renk modunu değiştir",
      toggleSidebar: "kenar çubuğunu aç/kapat",
      prev: "Önceki",
      next: "Sonraki",
    },
  },
  es: {
    prefix: "/es/",
    lang: "es-ES",
    name: "Español",
    description:
      "Internacionalización con tipos seguros y sin sobrecarga en tiempo de ejecución para todo el stack.",
    searchPlaceholder: "Buscar",
    nav: { guide: "Guía", frameworks: "Frameworks", cli: "CLI", api: "API" },
    theme: {
      selectLanguageText: "Idiomas",
      selectLanguageAriaLabel: "Seleccionar idioma",
      editLinkText: "Editar esta página",
      lastUpdatedText: "Última actualización",
      contributorsText: "Colaboradores",
      tip: "CONSEJO",
      warning: "ADVERTENCIA",
      danger: "PELIGRO",
      important: "IMPORTANTE",
      note: "NOTA",
      notFound: [
        "No hay nada aquí.",
        "La página no existe.",
        "El enlace parece estar roto.",
        "404 No encontrado",
      ],
      backToHome: "Volver al inicio",
      openInNewWindow: "abrir en una ventana nueva",
      toggleColorMode: "cambiar el modo de color",
      toggleSidebar: "mostrar u ocultar la barra lateral",
      prev: "Anterior",
      next: "Siguiente",
    },
  },
  de: {
    prefix: "/de/",
    lang: "de-DE",
    name: "Deutsch",
    description: "Typsichere Internationalisierung ohne Laufzeit-Overhead für den gesamten Stack.",
    searchPlaceholder: "Suchen",
    nav: { guide: "Anleitung", frameworks: "Frameworks", cli: "CLI", api: "API" },
    theme: {
      selectLanguageText: "Sprachen",
      selectLanguageAriaLabel: "Sprache auswählen",
      editLinkText: "Diese Seite bearbeiten",
      lastUpdatedText: "Zuletzt aktualisiert",
      contributorsText: "Mitwirkende",
      tip: "TIPP",
      warning: "WARNUNG",
      danger: "GEFAHR",
      important: "WICHTIG",
      note: "HINWEIS",
      notFound: [
        "Hier ist nichts.",
        "Diese Seite gibt es nicht.",
        "Der Link scheint defekt zu sein.",
        "404 Nicht gefunden",
      ],
      backToHome: "Zur Startseite",
      openInNewWindow: "in neuem Fenster öffnen",
      toggleColorMode: "Farbmodus wechseln",
      toggleSidebar: "Seitenleiste umschalten",
      prev: "Zurück",
      next: "Weiter",
    },
  },
  zh: {
    prefix: "/zh/",
    lang: "zh-CN",
    name: "简体中文",
    description: "面向全栈的类型安全、零运行时开销的国际化方案。",
    searchPlaceholder: "搜索",
    nav: { guide: "指南", frameworks: "框架", cli: "CLI", api: "API" },
    theme: {
      selectLanguageText: "语言",
      selectLanguageAriaLabel: "选择语言",
      editLinkText: "编辑此页",
      lastUpdatedText: "最后更新",
      contributorsText: "贡献者",
      tip: "提示",
      warning: "警告",
      danger: "危险",
      important: "重要",
      note: "注",
      notFound: ["这里什么都没有。", "页面不存在。", "链接似乎已失效。", "404 未找到"],
      backToHome: "返回首页",
      openInNewWindow: "在新窗口打开",
      toggleColorMode: "切换颜色模式",
      toggleSidebar: "切换侧边栏",
      prev: "上一页",
      next: "下一页",
    },
  },
};

/** The translated languages, in the order they appear in the language picker. */
export const TRANSLATED: LocaleCode[] = ["tr", "es", "de", "zh"];
