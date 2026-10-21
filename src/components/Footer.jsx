export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest py-space-md shadow-[0_-1px_6px_rgba(0,0,0,0.2)]">
      <div className="w-full px-margin flex flex-col md:flex-row items-center justify-between gap-space-sm text-center md:text-right">
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          نظام نقطة البيع والتحكم في المحطات • بلايستيشن كافيه POS
        </span>
        <div className="flex items-center gap-space-sm">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            حالة النظام: متصل • إصدار 2.4
          </span>
        </div>
      </div>
    </footer>
  );
}
