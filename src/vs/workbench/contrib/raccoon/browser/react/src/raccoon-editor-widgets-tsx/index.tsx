/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { mountFnGenerator } from '../util/mountFnGenerator.js';
import { raccoonCommandBarMain } from './RaccoonCommandBar.js';
import { raccoonSelectionHelperMain } from './RaccoonSelectionHelper.js';

export const mountraccoonCommandBar = mountFnGenerator(raccoonCommandBarMain);

export const mountraccoonSelectionHelper = mountFnGenerator(raccoonSelectionHelperMain);
