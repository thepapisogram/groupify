export default function Alert({ show, text }:{ show:boolean, text:string }) {

  return (
    <div
      role="alert"
      className={`fixed top-40 md:top-14 left-1/2 md:left-40 lg:left-48 xl:left-52 transform -translate-x-1/2 -translate-y-1/2 flex alert alert-info bg-slate-500 dark:bg-teal-800 text-sm text-white shadow-lg w-max transition-all duration-300 ${
        show ? "opacity-100" : "opacity-0"
      }`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>{text}</span>
    </div>
  );
}
