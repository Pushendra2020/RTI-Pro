import { useEffect } from "react";
import {
  CheckCircle2,
  FilePlus2,
  FileText,
  HelpCircle,
  Home,
  Info,
  ListChecks,
  MessageSquare,
  Mic,
  Search,
  Send,
} from "lucide-react";

export default function App() {
  return (
    <div>
      <div className="bg-white text-neutral-950 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <div className="min-h-[1024px] font-['Inter',sans-serif] bg-white flex flex-col w-full">
          <header className="border-neutral-200 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-12 py-6 justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-neutral-900 flex justify-center items-center">
                <span className="font-semibold text-neutral-50 text-sm leading-5">
                  साथी
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-neutral-950 text-lg leading-7 tracking-[3.2px]">
                  SAATHI
                </span>
                <span className="text-neutral-500 text-sm leading-5">
                  RTI filing portal
                </span>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="rounded-lg border-neutral-200 border-1 border-solid flex items-center h-11 overflow-hidden">
                <button className="font-medium text-sm leading-5 px-4 h-full">
                  English
                </button>
                <button className="font-medium text-sm leading-5 px-4 h-full">
                  हिन्दी
                </button>
                <button className="font-medium text-sm leading-5 px-4 h-full">
                  मराठी
                </button>
              </div>
              <a className="underline-offset-4 underline font-medium text-neutral-950 text-sm leading-5">
                Track your application
              </a>
            </div>
          </header>
          <nav className="border-neutral-200 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-12 py-4 items-center gap-8">
            <a className="font-medium text-neutral-950 text-sm leading-5 border-neutral-900 border-t-0 border-r-0 border-b-2 border-l-0 border-solid flex pb-2 items-center gap-2">
              <Home className="size-5" />
              Home
            </a>
            <a className="font-medium text-neutral-500 text-sm leading-5 flex pb-2 items-center gap-2">
              <FileText className="size-5 text-neutral-50" />
              File RTI
            </a>
            <a className="font-medium text-neutral-500 text-sm leading-5 flex pb-2 items-center gap-2">
              <Search className="size-5" />
              Track Application
            </a>
            <a className="font-medium text-neutral-500 text-sm leading-5 flex pb-2 items-center gap-2">
              <HelpCircle className="size-5" />
              {`Help & FAQs`}
            </a>
            <a className="font-medium text-neutral-500 text-sm leading-5 flex pb-2 items-center gap-2">
              <Info className="size-5" />
              About
            </a>
          </nav>
          <main className="grid grid-cols-2 p-12 flex-1 gap-12">
            <section className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <h1 className="font-bold text-neutral-950 text-[32px] leading-[38px] tracking-normal">
                  File an RTI application
                </h1>
                <p className="text-neutral-500 text-base leading-6">
                  Ask clearly. Get the information you need.
                </p>
              </div>
              <div className="flex flex-col gap-4 w-full">
                <button className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] leading-6 flex px-6 justify-center items-center gap-2 w-full h-11">
                  <Mic className="size-5" />
                  Use voice
                </button>
                <button className="font-semibold rounded-lg bg-white text-neutral-950 text-[15px] leading-6 border-neutral-900 border-1 border-solid flex px-6 justify-center items-center gap-2 w-full h-11">
                  <FilePlus2 className="size-5" />
                  File manually
                </button>
              </div>
              <div className="grid grid-cols-3 pt-2 gap-8">
                <div className="flex flex-col gap-2">
                  <MessageSquare className="size-5 text-neutral-950" />
                  <span className="font-semibold text-neutral-950 text-2xl leading-8">
                    01
                  </span>
                  <span className="text-neutral-500 text-sm leading-5">
                    Describe your request
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <ListChecks className="size-5 text-neutral-950" />
                  <span className="font-semibold text-neutral-950 text-2xl leading-8">
                    02
                  </span>
                  <span className="text-neutral-500 text-sm leading-5">
                    Choose the public authority
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <CheckCircle2 className="size-5 text-neutral-950" />
                  <span className="font-semibold text-neutral-950 text-2xl leading-8">
                    03
                  </span>
                  <span className="text-neutral-500 text-sm leading-5">
                    Review and submit
                  </span>
                </div>
              </div>
            </section>
            <section className="flex items-center">
              <div className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid flex p-8 flex-col gap-6 w-full">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold uppercase text-neutral-500 text-xs leading-4 tracking-[1.28px]">
                      YOUR APPLICATION
                    </span>
                    <span className="font-semibold uppercase rounded-lg text-neutral-500 text-xs leading-4 tracking-[1.28px] border-neutral-200 border-1 border-solid px-3 py-2">
                      01 / 03
                    </span>
                  </div>
                  <h2 className="font-semibold text-neutral-950 text-2xl leading-[31px]">
                    Build your RTI request
                  </h2>
                </div>
                <div className="bg-neutral-200 w-full h-px" />
                <div className="flex items-center gap-4">
                  <div className="size-10 shrink-0 rounded-lg bg-neutral-900 flex justify-center items-center">
                    <FileText className="size-5 text-neutral-50" />
                  </div>
                  <span className="font-semibold text-neutral-950 text-lg leading-7">
                    Describe your request
                  </span>
                </div>
                <div className="bg-neutral-200 w-full h-px" />
                <div className="flex items-center gap-4">
                  <div className="size-10 shrink-0 rounded-lg bg-neutral-100 flex justify-center items-center">
                    <Send className="size-5 text-neutral-950" />
                  </div>
                  <span className="font-semibold text-neutral-950 text-lg leading-7">
                    Choose the public authority
                  </span>
                </div>
                <div className="bg-neutral-200 w-full h-px" />
                <div className="flex items-center gap-4">
                  <div className="size-10 shrink-0 rounded-lg bg-neutral-100 flex justify-center items-center">
                    <CheckCircle2 className="size-5 text-neutral-950" />
                  </div>
                  <span className="font-semibold text-neutral-950 text-lg leading-7">
                    Review and submit
                  </span>
                </div>
              </div>
            </section>
          </main>
          <footer className="border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex px-12 py-6 justify-end items-center">
            <span className="text-neutral-500 text-sm leading-5">
              Clear requests. Better answers.
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
