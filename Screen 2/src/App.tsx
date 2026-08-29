import { useEffect } from "react";
import {
  Building2,
  FileText,
  Menu,
  MessageSquare,
  Mic,
  Search,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function App() {
  return (
    <div>
      <div className="font-sans bg-white text-neutral-950 w-full h-fit h-fit min-h-screen w-screen min-w-screen max-w-screen overflow-visible">
        <div className="min-h-[1024px] max-w-[480px] bg-white flex mx-auto flex-col">
          <header className="border-neutral-200 border-t-0 border-r-0 border-b-1 border-l-0 border-solid flex px-6 py-4 flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="size-11 font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[13px] flex justify-center items-center">
                  साथी
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base leading-6 tracking-[2.4px]">
                    SAATHI
                  </span>
                  <span className="text-neutral-500 text-xs leading-4">
                    RTI filing portal
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 rounded-lg"
              >
                <X className="size-5 hidden" />
                <Menu className="size-5" />
              </Button>
            </div>
            <div className="hidden flex-col gap-4">
              <div className="rounded-lg bg-neutral-100 border-neutral-200 border-1 border-solid flex p-1 items-center gap-1">
                <Button className="font-medium rounded-sm text-sm leading-5 px-2 flex-1 h-9">
                  English
                </Button>
                <Button className="font-medium rounded-sm text-sm leading-5 px-2 flex-1 h-9">
                  हिन्दी
                </Button>
                <Button className="font-medium rounded-sm text-sm leading-5 px-2 flex-1 h-9">
                  मराठी
                </Button>
              </div>
              <Button
                variant="outline"
                className="font-semibold rounded-lg text-[15px] border-neutral-900 border-0 border-solid px-4 h-11"
              >
                <Search className="size-5" />
                Track application
              </Button>
              <div className="text-center rounded-lg bg-neutral-100 text-neutral-500 text-sm leading-5 hidden p-3">
                Tracking available
              </div>
            </div>
          </header>
          <main className="flex px-6 py-8 flex-col flex-1 gap-8">
            <section className="flex flex-col gap-6">
              <h1 className="tracking-0 font-bold text-[32px] leading-[38px]">
                File an RTI application
              </h1>
              <div className="flex flex-col gap-3">
                <Button className="font-semibold rounded-lg bg-neutral-900 text-neutral-50 text-[15px] px-4 w-full h-11">
                  <Mic className="size-5" />
                  Use voice
                </Button>
                <Button
                  variant="outline"
                  className="font-semibold rounded-lg text-[15px] border-neutral-900 border-0 border-solid px-4 w-full h-11"
                >
                  <FileText className="size-5" />
                  File manually
                </Button>
              </div>
              <div className="text-center rounded-lg bg-neutral-100 text-sm leading-5 hidden p-3">
                Application form ready
              </div>
            </section>
            <section className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="font-bold text-2xl leading-8 w-8">01</span>
                <div className="flex items-center flex-1 gap-2">
                  <MessageSquare className="size-5" />
                  <span className="font-semibold text-base leading-6">
                    Describe your request
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-2xl leading-8 w-8">02</span>
                <div className="flex items-center flex-1 gap-2">
                  <Building2 className="size-5" />
                  <span className="font-semibold text-base leading-6">
                    Choose the public authority
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-2xl leading-8 w-8">03</span>
                <div className="flex items-center flex-1 gap-2">
                  <Send className="size-5" />
                  <span className="font-semibold text-lg leading-[25px]">
                    Review and submit
                  </span>
                </div>
              </div>
            </section>
            <Card className="shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-xl bg-white border-neutral-200 border-1 border-solid p-6 gap-4">
              <CardHeader className="p-0 gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-neutral-500 text-xs leading-4 tracking-[1.28px]">
                    YOUR APPLICATION
                  </span>
                  <span className="font-semibold text-neutral-500 text-xs leading-4 tracking-[1.28px]">
                    01 / 03
                  </span>
                </div>
                <h2 className="font-semibold text-2xl leading-[31px]">
                  File an RTI application
                </h2>
              </CardHeader>
              <CardContent className="flex p-0 flex-col gap-0">
                <div className="border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex py-4 items-center gap-4">
                  <div className="size-10 shrink-0 rounded-lg bg-neutral-900 text-neutral-50 flex justify-center items-center">
                    <MessageSquare className="size-5" />
                  </div>
                  <span className="font-semibold text-lg leading-[25px]">
                    Describe your request
                  </span>
                </div>
                <div className="border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex py-4 items-center gap-4">
                  <div className="size-10 shrink-0 rounded-lg bg-neutral-100 flex justify-center items-center">
                    <Building2 className="size-5" />
                  </div>
                  <span className="font-semibold text-lg leading-[25px]">
                    Choose the public authority
                  </span>
                </div>
                <div className="border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid flex py-4 items-center gap-4">
                  <div className="size-10 shrink-0 rounded-lg bg-neutral-100 flex justify-center items-center">
                    <Send className="size-5" />
                  </div>
                  <span className="font-semibold text-lg leading-[25px]">
                    Review and submit
                  </span>
                </div>
                <p className="text-neutral-500 text-sm leading-5 border-neutral-200 border-t-1 border-r-0 border-b-0 border-l-0 border-solid pt-4">
                  Your application number will appear after submission.
                </p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
