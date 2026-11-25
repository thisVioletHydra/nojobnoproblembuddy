import type { Actions, PageServerLoad } from './$types';

import { corpusState, parseRules } from '@cursor-chrome/hh';
import { createSearchProfile, distillAdmin, saveCorpusAdmin, saveFilterAdmin, saveQueryAdmin, saveResumeAdmin, saveRulesAdmin, suggestQueryAdmin, switchSearchProfile, unlinkAdmin, verifyAdmin } from '$lib/server/admin-actions';
import { isCreator, readAccount } from '$lib/server/secrets';
import { githubLogin, readSession } from '$lib/server/session';

const emptyRules = {
  activeSearchProfile: '',
  savedSearchProfiles: [] as string[],
  stopWords: '',
  mustWords: '',
  salaryMin: '',
  blacklist: '',
  corpusOn: false,
  corpusCount: 0,
  corpusBrief: '',
};

export const load: PageServerLoad = async ({ cookies }) => {
  const session = readSession(cookies.get('session'));
  if (session === null || githubLogin(session.login) === false)
    return emptyRules;

  if (isCreator(session.login) && cookies.get('preview') === 'guest')
    return emptyRules;

  const account = await readAccount(session.login);
  const corpus = await corpusState();

  return {
    ...ruleFields(account.hhRules),
    activeSearchProfile: account.searchProfileName,
    savedSearchProfiles: account.savedSearchProfiles.map(profile => profile.name),
    corpusOn: account.hhCorpus === '1',
    corpusCount: corpus.count,
    corpusBrief: corpus.brief,
  };
};

function ruleFields(raw: string) {
  const rules = parseRules(parsedRules(raw));

  return {
    stopWords: rules.stopWords.join('\n'),
    mustWords: rules.mustWords.join('\n'),
    salaryMin: rules.salaryMin > 0 ? String(rules.salaryMin) : '',
    blacklist: rules.blacklist.join('\n'),
  };
}

function parsedRules(raw: string): unknown {
  if (raw.length === 0)
    return null;

  try {
    return JSON.parse(raw);
  }
  catch {
    return null;
  }
}

export const actions: Actions = {
  createSearchProfile,
  switchSearchProfile,
  verify: verifyAdmin,
  resume: saveResumeAdmin,
  query: saveQueryAdmin,
  rules: saveRulesAdmin,
  filter: saveFilterAdmin,
  corpus: saveCorpusAdmin,
  distill: distillAdmin,
  suggest: suggestQueryAdmin,
  unlink: unlinkAdmin,
};
