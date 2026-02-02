
import {
    User, Calendar, Ticket, CaretRight,
    InstagramLogo, YoutubeLogo,
    SealCheck, BellRinging, Bell, BellSlash, House, Megaphone, Article, SignOut,
    DownloadSimple, Export, ChatCircleDots, Chat, Ghost, ArrowRight,
    Fire, Plant, Leaf, Sparkle, Waves, Boat, Barbell, Globe
} from '@phosphor-icons/react';

// [STABILITY FIX] Standardized Icon Set
// Problematic icons are handled with inline SVGs to bypass Rollup binding issues.
export const Icons = {
    User, Calendar, Ticket, CaretRight,
    InstagramLogo, YoutubeLogo,
    SealCheck, BellRinging, Bell, BellSlash, House, Megaphone, Article, SignOut,
    DownloadSimple, Export, ChatCircleDots, Chat, Ghost, ArrowRight,
    Fire, Plant, Leaf, Sparkle, Waves, Boat, Barbell, Globe,

    Sprout: (props) => (
        <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 256 256" fill="currentColor" {...props}>
            <path d="M240,104a56.06,56.06,0,0,0-56-56,12,12,0,0,0-12,12v88H152V128a56.06,56.06,0,0,0-56-56,12,12,0,0,0-12,12v64H73.37A28,28,0,0,0,48,128V112a12,12,0,0,0-24,0v16a52.06,52.06,0,0,0,47.28,51.71L116,231.14a12,12,0,0,0,24-2.28l-8.58-90.13c4.76,3.4,10.29,6,16.58,7.91V232a12,12,0,0,0,24,0V147.16c4.73,1,9.75,1.52,14.77,1.52a12,12,0,0,0,12-12V73a32,32,0,0,1,32,31A12,12,0,0,0,240,104Z" />
        </svg>
    ),

    CloudSun: (props) => (
        <svg width={props.size || 20} height={props.size || 20} viewBox="0 0 256 256" fill="currentColor" {...props}>
            <path d="M128,104a40,40,0,1,0,40,40A40,40,0,0,0,128,104Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,168Zm48-64h16a8,8,0,0,1,0,16H176a8,8,0,0,1,0-16ZM128,40a8,8,0,0,1,8,8V64a8,8,0,0,1-16,0V48A8,8,0,0,1,128,40ZM64,128a8,8,0,0,1,8-8H88a8,8,0,0,1,0,16H72A8,8,0,0,1,64,128ZM82.75,82.75a8,8,0,0,1,0,11.31l-11.32,11.32a8,8,0,0,1-11.31-11.32L71.44,82.75A8,8,0,0,1,82.75,82.75Zm90.5,0a8,8,0,0,1,11.32,0l11.31,11.32a8,8,0,0,1-11.31,11.32L173.25,94.06A8,8,0,0,1,173.25,82.75Z" />
            <path d="M228,160a44.05,44.05,0,0,0-43-34.79,60.1,60.1,0,0,0-114,21.57A44,44,0,1,0,72,232H200a44,44,0,0,0,28-72Zm-28,56H72a28,28,0,0,1,0-56h1.49a28,28,0,0,1,53,0H132v8h12.55a44.17,44.17,0,0,0,1.3-4.14,44.06,44.06,0,0,1,82.15,12.14,12.2,12.2,0,0,0,0,4.35A28,28,0,0,1,200,216Z" opacity="0.2" />
        </svg>
    )
};
