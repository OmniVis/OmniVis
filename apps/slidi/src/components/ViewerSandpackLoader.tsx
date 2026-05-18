"use client";

import dynamic from "next/dynamic";

const ViewerSandpack = dynamic(() => import("@/components/ViewerSandpack"), {
  ssr: false,
});

interface ViewerSandpackLoaderProps {
  code: string;
  id?: string;
}

export default function ViewerSandpackLoader({
  code,
  id,
}: ViewerSandpackLoaderProps) {
  return <ViewerSandpack code={code} id={id} />;
}
