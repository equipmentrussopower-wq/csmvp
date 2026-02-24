import ChaseLogo from "@/components/ChaseLogo";

/**
 * Full-screen branded splash shown on initial load / auth check.
 */
export const PageLoader = () => (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
        {/* Top progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden">
            <div className="h-full bg-[#0E76C7] animate-progress-bar" />
        </div>

        {/* Centered logo + spinner */}
        <div className="flex flex-col items-center gap-6">
            <ChaseLogo className="h-12 w-auto text-gray-900 animate-fade-in" />
            <div className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0E76C7] animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-[#0E76C7] animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-[#0E76C7] animate-bounce [animation-delay:300ms]" />
            </div>
        </div>
    </div>
);

/**
 * Slim top-of-page progress bar for route transitions.
 */
export const TopProgressBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 overflow-hidden">
        <div className="h-full bg-[#0E76C7] animate-progress-bar" />
    </div>
);
