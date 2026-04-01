import { IconWarning } from '../sidebar-tsx/SidebarChat.js';


export const WarningBox = ({ text, onClick, className }: {text: string;onClick?: () => void;className?: string;}) => {

  return <div
    className={` raccoon-text-raccoon-warning raccoon-brightness-90 raccoon-opacity-90 raccoon-w-fit raccoon-text-xs raccoon-text-ellipsis ${


    onClick ? `hover:raccoon-brightness-75 raccoon-transition-all raccoon-duration-200 raccoon-cursor-pointer` : ""} raccoon-flex raccoon-items-center raccoon-flex-nowrap ${

    className} `}

    onClick={onClick}>

		<IconWarning
      size={14}
      className="raccoon-mr-1 raccoon-flex-shrink-0" />

		<span>{text}</span>
	</div>;
  // return <raccoonSelectBox
  // 	options={[{ text: 'Please add a model!', value: null }]}
  // 	onChangeSelection={() => { }}
  // />
};