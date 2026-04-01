// Normally you'd want to put these exports in the files that register them, but if you do that you'll get an import order error if you import them in certain cases.
// (importing them runs the whole file to get the ID, causing an import error). I guess it's best practice to separate out IDs, pretty annoying...

export const raccoon_CTRL_L_ACTION_ID = 'raccoon.ctrlLAction'

export const raccoon_CTRL_K_ACTION_ID = 'raccoon.ctrlKAction'

export const raccoon_ACCEPT_DIFF_ACTION_ID = 'raccoon.acceptDiff'

export const raccoon_REJECT_DIFF_ACTION_ID = 'raccoon.rejectDiff'

export const raccoon_GOTO_NEXT_DIFF_ACTION_ID = 'raccoon.goToNextDiff'

export const raccoon_GOTO_PREV_DIFF_ACTION_ID = 'raccoon.goToPrevDiff'

export const raccoon_GOTO_NEXT_URI_ACTION_ID = 'raccoon.goToNextUri'

export const raccoon_GOTO_PREV_URI_ACTION_ID = 'raccoon.goToPrevUri'

export const raccoon_ACCEPT_FILE_ACTION_ID = 'raccoon.acceptFile'

export const raccoon_REJECT_FILE_ACTION_ID = 'raccoon.rejectFile'

export const raccoon_ACCEPT_ALL_DIFFS_ACTION_ID = 'raccoon.acceptAllDiffs'

export const raccoon_REJECT_ALL_DIFFS_ACTION_ID = 'raccoon.rejectAllDiffs'
