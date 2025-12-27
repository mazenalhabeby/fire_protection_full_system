import { cn } from "@/lib/utils";
import Image from "next/image";

interface FloatingTokenProps {
  src: string;
  className?: string;
  size: number;
  blur?: boolean;
  style?: React.CSSProperties;
}

function FloatingToken({
  src,
  className,
  size,
  blur = false,
  style,
}: FloatingTokenProps) {
  return (
    <div
      className={cn(
        "absolute pointer-events-none",
        blur && "blur-[2px] opacity-60",
        className
      )}
      style={style}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="object-contain"
        aria-hidden="true"
      />
    </div>
  );
}

export default FloatingToken;
