/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import { useAccessor, useIsDark, useSettingsState } from '../util/services.js';
import { Brain, Check, ChevronRight, DollarSign, ExternalLink, Lock, X } from 'lucide-react';
import { displayInfoOfProviderName, ProviderName, providerNames, localProviderNames, featureNames, FeatureName, isFeatureNameDisabled } from '../../../../common/raccoonSettingsTypes.js';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';
import { OllamaSetupInstructions, OneClickSwitchButton, SettingsForProvider, ModelDump } from '../raccoon-settings-tsx/Settings.js';
import { ColorScheme } from '../../../../../../../platform/theme/common/theme.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { isLinux } from '../../../../../../../base/common/platform.js';

const OVERRIDE_VALUE = false;

export const RaccoonOnboarding = () => {

  const raccoonSettingsState = useSettingsState();
  const isOnboardingComplete = raccoonSettingsState.globalSettings.isOnboardingComplete || OVERRIDE_VALUE;

  const isDark = useIsDark();

  return (
    <div className={`raccoon-scope ${isDark ? "raccoon-dark" : ""}`}>
			<div
        className={` raccoon-bg-raccoon-bg-3 raccoon-fixed raccoon-top-0 raccoon-right-0 raccoon-bottom-0 raccoon-left-0 raccoon-width-full raccoon-z-[99999] raccoon-transition-all raccoon-duration-1000 ${

        isOnboardingComplete ? "raccoon-opacity-0 raccoon-pointer-events-none" : "raccoon-opacity-100 raccoon-pointer-events-auto"} `}

        style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

				<ErrorBoundary>
					<RaccoonOnboardingContent />
				</ErrorBoundary>
			</div>
		</div>);

};

const RaccoonIcon = () => {
  const accessor = useAccessor();
  const themeService = accessor.get('IThemeService');

  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // void icon style
    const updateTheme = () => {
      const theme = themeService.getColorTheme().type;
      const isDark = theme === ColorScheme.DARK || theme === ColorScheme.HIGH_CONTRAST_DARK;
      if (divRef.current) {
        divRef.current.style.maxWidth = '220px';
        divRef.current.style.opacity = '50%';
        divRef.current.style.filter = isDark ? '' : 'invert(1)'; //brightness(.5)
      }
    };
    updateTheme();
    const d = themeService.onDidColorThemeChange(updateTheme);
    return () => d.dispose();
  }, []);

  const iconClass = "raccoon-" + "onboarding-logo";
  return <div ref={divRef} className={iconClass} />;
};

const FADE_DURATION_MS = 2000;

const FadeIn = ({ children, className, delayMs = 0, durationMs, ...props }: {children: React.ReactNode;delayMs?: number;durationMs?: number;className?: string;} & React.HTMLAttributes<HTMLDivElement>) => {

  const [opacity, setOpacity] = useState(0);

  const effectiveDurationMs = durationMs ?? FADE_DURATION_MS;

  useEffect(() => {

    const timeout = setTimeout(() => {
      setOpacity(1);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [setOpacity, delayMs]);


  return (
    <div className={className} style={{ opacity, transition: `opacity ${effectiveDurationMs}ms ease-in-out` }} {...props}>
			{children}
		</div>);

};

// Onboarding

// =============================================
//  New AddProvidersPage Component and helpers
// =============================================

const tabNames = ['Free', 'Paid', 'Local'] as const;

type TabName = typeof tabNames[number] | 'Cloud/Other';

// Data for cloud providers tab
const cloudProviders: ProviderName[] = ['googleVertex', 'liteLLM', 'microsoftAzure', 'awsBedrock', 'openAICompatible'];

// Data structures for provider tabs
const providerNamesOfTab: Record<TabName, ProviderName[]> = {
  Free: ['gemini', 'openRouter'],
  Local: localProviderNames,
  Paid: providerNames.filter((pn) => !(['gemini', 'openRouter', ...localProviderNames, ...cloudProviders] as string[]).includes(pn)) as ProviderName[],
  'Cloud/Other': cloudProviders
};

const descriptionOfTab: Record<TabName, string> = {
  Free: `Providers with a 100% free tier. Add as many as you'd like!`,
  Paid: `Connect directly with any provider (bring your own key).`,
  Local: `Active providers should appear automatically. Add as many as you'd like! `,
  'Cloud/Other': `Add as many as you'd like! Reach out for custom configuration requests.`
};


const featureNameMap: {display: string;featureName: FeatureName;}[] = [
{ display: 'Chat', featureName: 'Chat' },
{ display: 'Quick Edit', featureName: 'Ctrl+K' },
{ display: 'Autocomplete', featureName: 'Autocomplete' },
{ display: 'Fast Apply', featureName: 'Apply' },
{ display: 'Source Control', featureName: 'SCM' }];


const AddProvidersPage = ({ pageIndex, setPageIndex }: {pageIndex: number;setPageIndex: (index: number) => void;}) => {
  const [currentTab, setCurrentTab] = useState<TabName>('Free');
  const settingsState = useSettingsState();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clear error message after 5 seconds
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (errorMessage) {
      timeoutId = setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    }

    // Cleanup function to clear the timeout if component unmounts or error changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [errorMessage]);

  return <div className="raccoon-flex raccoon-flex-col md:raccoon-flex-row raccoon-w-full raccoon-h-[80vh] raccoon-gap-6 raccoon-max-w-[900px] raccoon-mx-auto raccoon-relative">
		{/* Left Column */}
		<div className="md:raccoon-w-1/4 raccoon-w-full raccoon-flex raccoon-flex-col raccoon-gap-6 raccoon-p-6 raccoon-border-none raccoon-border-raccoon-border-2 raccoon-h-full raccoon-overflow-y-auto">
			{/* Tab Selector */}
			<div className="raccoon-flex md:raccoon-flex-col raccoon-gap-2">
				{[...tabNames, 'Cloud/Other'].map((tab) =>
        <button
          key={tab}
          className={`raccoon-py-2 raccoon-px-4 raccoon-rounded-md raccoon-text-left ${currentTab === tab ? "raccoon-bg-[#0e70c0]/80 raccoon-text-white raccoon-font-medium raccoon-shadow-sm" : "raccoon-bg-raccoon-bg-2 hover:raccoon-bg-raccoon-bg-2/80 raccoon-text-raccoon-fg-1"} raccoon-transition-all raccoon-duration-200`}



          onClick={() => {
            setCurrentTab(tab as TabName);
            setErrorMessage(null); // Reset error message when changing tabs
          }}>

						{tab}
					</button>
        )}
			</div>

			{/* Feature Checklist */}
			<div className="raccoon-flex raccoon-flex-col raccoon-gap-1 raccoon-mt-4 raccoon-text-sm raccoon-opacity-80">
				{featureNameMap.map(({ display, featureName }) => {
          const hasModel = settingsState.modelSelectionOfFeature[featureName] !== null;
          return (
            <div key={featureName} className="raccoon-flex raccoon-items-center raccoon-gap-2">
							{hasModel ?
              <Check className="raccoon-w-4 raccoon-h-4 raccoon-text-emerald-500" /> :

              <div className="raccoon-w-3 raccoon-h-3 raccoon-rounded-full raccoon-flex raccoon-items-center raccoon-justify-center">
									<div className="raccoon-w-1 raccoon-h-1 raccoon-rounded-full raccoon-bg-white/70"></div>
								</div>
              }
							<span>{display}</span>
						</div>);

        })}
			</div>
		</div>

		{/* Right Column */}
		<div className="raccoon-flex-1 raccoon-flex raccoon-flex-col raccoon-items-center raccoon-justify-start raccoon-p-6 raccoon-h-full raccoon-overflow-y-auto">
			<div className="raccoon-text-5xl raccoon-mb-2 raccoon-text-center raccoon-w-full">Add a Provider</div>

			<div className="raccoon-w-full raccoon-max-w-xl raccoon-mt-4 raccoon-mb-10">
				<div className="raccoon-text-4xl raccoon-font-light raccoon-my-4 raccoon-w-full">{currentTab}</div>
				<div className="raccoon-text-sm raccoon-opacity-80 raccoon-text-raccoon-fg-3 raccoon-my-4 raccoon-w-full">{descriptionOfTab[currentTab]}</div>
			</div>

			{providerNamesOfTab[currentTab].map((providerName) =>
      <div key={providerName} className="raccoon-w-full raccoon-max-w-xl raccoon-mb-10">
					<div className="raccoon-text-xl raccoon-mb-2">
						Add {displayInfoOfProviderName(providerName).title}
						{providerName === 'gemini' &&
          <span
            data-tooltip-id="raccoon-tooltip-provider-info"
            data-tooltip-content="Gemini 2.5 Pro offers 25 free messages a day, and Gemini 2.5 Flash offers 500. We recommend using models down the line as you run out of free credits."
            data-tooltip-place="right"
            className="raccoon-ml-1 raccoon-text-xs raccoon-align-top raccoon-text-blue-400">
            *</span>
          }
						{providerName === 'openRouter' &&
          <span
            data-tooltip-id="raccoon-tooltip-provider-info"
            data-tooltip-content="OpenRouter offers 50 free messages a day, and 1000 if you deposit $10. Only applies to models labeled ':free'."
            data-tooltip-place="right"
            className="raccoon-ml-1 raccoon-text-xs raccoon-align-top raccoon-text-blue-400">
            *</span>
          }
					</div>
					<div>
						<SettingsForProvider providerName={providerName} showProviderTitle={false} showProviderSuggestions={true} />

					</div>
					{providerName === 'ollama' && <OllamaSetupInstructions />}
				</div>
      )}

			{(currentTab === 'Local' || currentTab === 'Cloud/Other') &&
      <div className="raccoon-w-full raccoon-max-w-xl raccoon-mt-8 raccoon-bg-raccoon-bg-2/50 raccoon-rounded-lg raccoon-p-6 raccoon-border raccoon-border-raccoon-border-4">
					<div className="raccoon-flex raccoon-items-center raccoon-gap-2 raccoon-mb-4">
						<div className="raccoon-text-xl raccoon-font-medium">Models</div>
					</div>

					{currentTab === 'Local' &&
        <div className="raccoon-text-sm raccoon-opacity-80 raccoon-text-raccoon-fg-3 raccoon-my-4 raccoon-w-full">Local models should be detected automatically. You can add custom models below.</div>
        }

					{currentTab === 'Local' && <ModelDump filteredProviders={localProviderNames} />}
					{currentTab === 'Cloud/Other' && <ModelDump filteredProviders={cloudProviders} />}
				</div>
      }



			{/* Navigation buttons in right column */}
			<div className="raccoon-flex raccoon-flex-col raccoon-items-end raccoon-w-full raccoon-mt-auto raccoon-pt-8">
				{errorMessage &&
        <div className="raccoon-text-amber-400 raccoon-mb-2 raccoon-text-sm raccoon-opacity-80 raccoon-transition-opacity raccoon-duration-300">{errorMessage}</div>
        }
				<div className="raccoon-flex raccoon-items-center raccoon-gap-2">
					<PreviousButton onClick={() => setPageIndex(pageIndex - 1)} />
					<NextButton
            onClick={() => {
              const isDisabled = isFeatureNameDisabled('Chat', settingsState);

              if (!isDisabled) {
                setPageIndex(pageIndex + 1);
                setErrorMessage(null);
              } else {
                // Show error message
                setErrorMessage("Please set up at least one Chat model before moving on.");
              }
            }} />

				</div>
			</div>
		</div>
	</div>;
};
// =============================================
// 	OnboardingPage
// 		title:
// 			div
// 				"Welcome to Raccoon"
// 			image
// 		content:<></>
// 		title
// 		content
// 		prev/next

// 	OnboardingPage
// 		title:
// 			div
// 				"How would you like to use Raccoon?"
// 		content:
// 			ModelQuestionContent
// 				|
// 					div
// 						"I want to:"
// 					div
// 						"Use the smartest models"
// 						"Keep my data fully private"
// 						"Save money"
// 						"I don't know"
// 				| div
// 					| div
// 						"We recommend using "
// 						"Set API"
// 					| div
// 						""
// 					| div
//
// 		title
// 		content
// 		prev/next
//
// 	OnboardingPage
// 		title
// 		content
// 		prev/next

const NextButton = ({ onClick, ...props }: {onClick: () => void;} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {

  // Create a new props object without the disabled attribute
  const { disabled, ...buttonProps } = props;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onDoubleClick={onClick}
      className={`raccoon-px-6 raccoon-py-2 raccoon-bg-zinc-100 ${disabled ? "raccoon-bg-zinc-100/40 raccoon-cursor-not-allowed" : "hover:raccoon-bg-zinc-100"} raccoon-rounded raccoon-text-black raccoon-duration-600 raccoon-transition-all `}




      {...disabled && {
        'data-tooltip-id': 'raccoon-tooltip',
        "data-tooltip-content": 'Please enter all required fields or choose another provider', // (double-click to proceed anyway, can come back in Settings)
        "data-tooltip-place": 'top'
      }}
      {...buttonProps}>

			Next
		</button>);

};

const PreviousButton = ({ onClick, ...props }: {onClick: () => void;} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <button
      onClick={onClick}
      className="raccoon-px-6 raccoon-py-2 raccoon-rounded raccoon-text-raccoon-fg-3 raccoon-opacity-80 hover:raccoon-brightness-115 raccoon-duration-600 raccoon-transition-all"
      {...props}>

			Back
		</button>);

};



const OnboardingPageShell = ({ top, bottom, content, hasMaxWidth = true, className = ''





}: {top?: React.ReactNode;bottom?: React.ReactNode;content?: React.ReactNode;hasMaxWidth?: boolean;className?: string;}) => {
  return (
    <div className={`raccoon-h-[80vh] raccoon-text-lg raccoon-flex raccoon-flex-col raccoon-gap-4 raccoon-w-full raccoon-mx-auto ${hasMaxWidth ? "raccoon-max-w-[600px]" : ""} ${className}`}>
			{top && <FadeIn className="raccoon-w-full raccoon-mb-auto raccoon-pt-16">{top}</FadeIn>}
			{content && <FadeIn className="raccoon-w-full raccoon-my-auto">{content}</FadeIn>}
			{bottom && <div className="raccoon-w-full raccoon-pb-8">{bottom}</div>}
		</div>);

};

const OllamaDownloadOrRemoveModelButton = ({ modelName, isModelInstalled, sizeGb }: {modelName: string;isModelInstalled: boolean;sizeGb: number | false | 'not-known';}) => {
  // for now just link to the ollama download page
  return <a
    href={`https://ollama.com/library/${modelName}`}
    target="_blank"
    rel="noopener noreferrer"
    className="raccoon-flex raccoon-items-center raccoon-justify-center raccoon-text-raccoon-fg-2 hover:raccoon-text-raccoon-fg-1">

		<ExternalLink className="raccoon-w-3.5 raccoon-h-3.5" />
	</a>;

};


const YesNoText = ({ val }: {val: boolean | null;}) => {

  return <div
    className={
    val === true ? "raccoon-text raccoon-text-emerald-500" :
    val === false ? "raccoon-text-rose-600" : "raccoon-text raccoon-text-amber-300"}>



		{
    val === true ? "Yes" :
    val === false ? 'No' :
    "Yes*"
    }
	</div>;

};



const abbreviateNumber = (num: number): string => {
  if (num >= 1000000) {
    // For millions
    return Math.floor(num / 1000000) + 'M';
  } else if (num >= 1000) {
    // For thousands
    return Math.floor(num / 1000) + 'K';
  } else {
    // For numbers less than 1000
    return num.toString();
  }
};





const PrimaryActionButton = ({ children, className, ringSize, ...props }: {children: React.ReactNode;ringSize?: undefined | 'xl' | 'screen';} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {


  return (
    <button
      type='button'
      className={` raccoon-flex raccoon-items-center raccoon-justify-center raccoon-text-white dark:raccoon-text-black raccoon-bg-black/90 dark:raccoon-bg-white/90 ${





      ringSize === 'xl' ? ` raccoon-gap-2 raccoon-px-16 raccoon-py-8 raccoon-transition-all raccoon-duration-300 raccoon-ease-in-out ` :



      ringSize === 'screen' ? ` raccoon-gap-2 raccoon-px-16 raccoon-py-8 raccoon-transition-all raccoon-duration-1000 raccoon-ease-in-out ` :


      ringSize === undefined ? ` raccoon-gap-1 raccoon-px-4 raccoon-py-2 raccoon-transition-all raccoon-duration-300 raccoon-ease-in-out ` : ""} raccoon-rounded-lg raccoon-group ${






      className} `}

      {...props}>

			{children}
			<ChevronRight
        className={` raccoon-transition-all raccoon-duration-300 raccoon-ease-in-out raccoon-transform group-hover:raccoon-translate-x-1 group-active:raccoon-translate-x-1 `} />







		</button>);

};


type WantToUseOption = 'smart' | 'private' | 'cheap' | 'all';

const RaccoonOnboardingContent = () => {


  const accessor = useAccessor();
  const raccoonSettingsService = accessor.get('IRaccoonSettingsService');
  const raccoonMetricsService = accessor.get('IMetricsService');

  const raccoonSettingsState = useSettingsState();

  const [pageIndex, setPageIndex] = useState(0);


  // page 1 state
  const [wantToUseOption, setWantToUseOption] = useState<WantToUseOption>('smart');

  // Replace the single selectedProviderName with four separate states
  // page 2 state - each tab gets its own state
  const [selectedIntelligentProvider, setSelectedIntelligentProvider] = useState<ProviderName>('anthropic');
  const [selectedPrivateProvider, setSelectedPrivateProvider] = useState<ProviderName>('ollama');
  const [selectedAffordableProvider, setSelectedAffordableProvider] = useState<ProviderName>('gemini');
  const [selectedAllProvider, setSelectedAllProvider] = useState<ProviderName>('anthropic');

  // Helper function to get the current selected provider based on active tab
  const getSelectedProvider = (): ProviderName => {
    switch (wantToUseOption) {
      case 'smart':return selectedIntelligentProvider;
      case 'private':return selectedPrivateProvider;
      case 'cheap':return selectedAffordableProvider;
      case 'all':return selectedAllProvider;
    }
  };

  // Helper function to set the selected provider for the current tab
  const setSelectedProvider = (provider: ProviderName) => {
    switch (wantToUseOption) {
      case 'smart':setSelectedIntelligentProvider(provider);break;
      case 'private':setSelectedPrivateProvider(provider);break;
      case 'cheap':setSelectedAffordableProvider(provider);break;
      case 'all':setSelectedAllProvider(provider);break;
    }
  };

  const providerNamesOfWantToUseOption: { [wantToUseOption in WantToUseOption]: ProviderName[] } = {
    smart: ['anthropic', 'openAI', 'gemini', 'openRouter'],
    private: ['ollama', 'vLLM', 'openAICompatible', 'lmStudio'],
    cheap: ['gemini', 'deepseek', 'openRouter', 'ollama', 'vLLM'],
    all: providerNames
  };


  const selectedProviderName = getSelectedProvider();
  const didFillInProviderSettings = selectedProviderName && raccoonSettingsState.settingsOfProvider[selectedProviderName]._didFillInProviderSettings;
  const isApiKeyLongEnoughIfApiKeyExists = selectedProviderName && raccoonSettingsState.settingsOfProvider[selectedProviderName].apiKey ? raccoonSettingsState.settingsOfProvider[selectedProviderName].apiKey.length > 15 : true;
  const isAtLeastOneModel = selectedProviderName && raccoonSettingsState.settingsOfProvider[selectedProviderName].models.length >= 1;

  const didFillInSelectedProviderSettings = !!(didFillInProviderSettings && isApiKeyLongEnoughIfApiKeyExists && isAtLeastOneModel);

  const prevAndNextButtons = <div className="raccoon-max-w-[600px] raccoon-w-full raccoon-mx-auto raccoon-flex raccoon-flex-col raccoon-items-end">
		<div className="raccoon-flex raccoon-items-center raccoon-gap-2">
			<PreviousButton
        onClick={() => {setPageIndex(pageIndex - 1);}} />

			<NextButton
        onClick={() => {setPageIndex(pageIndex + 1);}} />

		</div>
	</div>;


  const lastPagePrevAndNextButtons = <div className="raccoon-max-w-[600px] raccoon-w-full raccoon-mx-auto raccoon-flex raccoon-flex-col raccoon-items-end">
		<div className="raccoon-flex raccoon-items-center raccoon-gap-2">
			<PreviousButton
        onClick={() => {setPageIndex(pageIndex - 1);}} />

			<PrimaryActionButton
        onClick={() => {
          raccoonSettingsService.setGlobalSetting('isOnboardingComplete', true);
          raccoonMetricsService.capture('Completed Onboarding', { selectedProviderName, wantToUseOption });
        }}
        ringSize={raccoonSettingsState.globalSettings.isOnboardingComplete ? 'screen' : undefined}>
        Open Raccoon</PrimaryActionButton>
		</div>
	</div>;


  // cannot be md
  const basicDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
    smart: "Models with the best performance on benchmarks.",
    private: "Host on your computer or local network for full data privacy.",
    cheap: "Free and affordable options.",
    all: ""
  };

  // can be md
  const detailedDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
    smart: "Most intelligent and best for agent mode.",
    private: "Private-hosted so your data never leaves your computer or network. [Email us](mailto:founders@void.ai) for help setting up at your company.",
    cheap: "Use great deals like Gemini 2.5 Pro, or self-host a model with Ollama or vLLM for free.",
    all: ""
  };

  // Modified: initialize separate provider states on initial render instead of watching wantToUseOption changes
  useEffect(() => {
    if (selectedIntelligentProvider === undefined) {
      setSelectedIntelligentProvider(providerNamesOfWantToUseOption['smart'][0]);
    }
    if (selectedPrivateProvider === undefined) {
      setSelectedPrivateProvider(providerNamesOfWantToUseOption['private'][0]);
    }
    if (selectedAffordableProvider === undefined) {
      setSelectedAffordableProvider(providerNamesOfWantToUseOption['cheap'][0]);
    }
    if (selectedAllProvider === undefined) {
      setSelectedAllProvider(providerNamesOfWantToUseOption['all'][0]);
    }
  }, []);

  // reset the page to page 0 if the user redos onboarding
  useEffect(() => {
    if (!raccoonSettingsState.globalSettings.isOnboardingComplete) {
      setPageIndex(0);
    }
  }, [setPageIndex, raccoonSettingsState.globalSettings.isOnboardingComplete]);


  const contentOfIdx: {[pageIndex: number]: React.ReactNode;} = {
    0: <OnboardingPageShell
      content={
      <div className="raccoon-flex raccoon-flex-col raccoon-items-center raccoon-gap-8">
					{/* Raccoon icon (moved up) */}
					<div className="raccoon-max-w-md raccoon-w-full raccoon-h-[30vh] raccoon-mx-auto raccoon-flex raccoon-items-center raccoon-justify-center">
						{!isLinux && <RaccoonIcon />}
					</div>

					<div className="raccoon-text-5xl raccoon-font-light raccoon-text-center">Welcome to Raccoon</div>


					<FadeIn
          delayMs={1000}>

						<PrimaryActionButton
            onClick={() => {setPageIndex(1);}}>

							Get Started
						</PrimaryActionButton>
					</FadeIn>

				</div>
      } />,


    1: <OnboardingPageShell hasMaxWidth={false}
    content={
    <AddProvidersPage pageIndex={pageIndex} setPageIndex={setPageIndex} />
    } />,

    2: <OnboardingPageShell

      content={
      <div>
					<div className="raccoon-text-5xl raccoon-font-light raccoon-text-center">Settings and Themes</div>

					<div className="raccoon-mt-8 raccoon-text-center raccoon-flex raccoon-flex-col raccoon-items-center raccoon-gap-4 raccoon-w-full raccoon-max-w-md raccoon-mx-auto">
						<h4 className="raccoon-text-raccoon-fg-3 raccoon-mb-4">Transfer your settings from an existing editor?</h4>
						<OneClickSwitchButton className="raccoon-w-full raccoon-px-4 raccoon-py-2" fromEditor="VS Code" />
						<OneClickSwitchButton className="raccoon-w-full raccoon-px-4 raccoon-py-2" fromEditor="Cursor" />
						<OneClickSwitchButton className="raccoon-w-full raccoon-px-4 raccoon-py-2" fromEditor="Windsurf" />
					</div>
				</div>
      }
      bottom={lastPagePrevAndNextButtons} />

  };


  return <div key={pageIndex} className="raccoon-w-full raccoon-h-[80vh] raccoon-text-left raccoon-mx-auto raccoon-flex raccoon-flex-col raccoon-items-center raccoon-justify-center">
		<ErrorBoundary>
			{contentOfIdx[pageIndex]}
		</ErrorBoundary>
	</div>;

};