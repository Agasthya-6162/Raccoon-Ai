/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useSettingsState } from '../util/services.js';
import { errorDetails } from '../../../../common/sendLLMMessageTypes.js';


export const ErrorDisplay = ({
  message: message_,
  fullError,
  onDismiss,
  showDismiss





}: {message: string;fullError: Error | null;onDismiss: (() => void) | null;showDismiss?: boolean;}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const details = errorDetails(fullError);
  const isExpandable = !!details;

  const message = message_ + '';

  return (
    <div className={`raccoon-rounded-md raccoon-border raccoon-border-red-500/30 raccoon-bg-red-500/10 raccoon-p-4 raccoon-overflow-auto`}>
			{/* Header */}
			<div className="raccoon-flex raccoon-items-start raccoon-justify-between">
				<div className="raccoon-flex raccoon-gap-3">
					<AlertCircle className="raccoon-h-5 raccoon-w-5 raccoon-text-red-500 raccoon-mt-0.5" />
					<div className="raccoon-flex-1">
						<h3 className="raccoon-font-semibold raccoon-text-raccoon-fg-1">
							{/* eg Error */}
							Error
						</h3>
						<p className="raccoon-text-raccoon-fg-2 raccoon-mt-1">
							{/* eg Something went wrong */}
							{message}
						</p>
					</div>
				</div>

				<div className="raccoon-flex raccoon-gap-2">
					{isExpandable &&
          <button className="raccoon-text-raccoon-fg-3 hover:raccoon-text-raccoon-fg-1 raccoon-p-1 raccoon-rounded"
          onClick={() => setIsExpanded(!isExpanded)}>

							{isExpanded ?
            <ChevronUp className="raccoon-h-5 raccoon-w-5" /> :

            <ChevronDown className="raccoon-h-5 raccoon-w-5" />
            }
						</button>
          }
					{showDismiss && onDismiss &&
          <button className="raccoon-text-raccoon-fg-3 hover:raccoon-text-raccoon-fg-1 raccoon-p-1 raccoon-rounded"
          onClick={onDismiss}>

							<X className="raccoon-h-5 raccoon-w-5" />
						</button>
          }
				</div>
			</div>

			{/* Expandable Details */}
			{isExpanded && details &&
      <div className="raccoon-mt-4 raccoon-space-y-3 raccoon-border-t raccoon-border-red-500/20 raccoon-pt-3 raccoon-overflow-auto">
					<div>
						<span className="raccoon-font-semibold raccoon-text-raccoon-fg-2">Full Error: </span>
						<pre className="raccoon-text-raccoon-fg-3 raccoon-text-sm raccoon-mt-2 raccoon-whitespace-pre-wrap raccoon-break-words">{details}</pre>
					</div>
				</div>
      }
		</div>);

};