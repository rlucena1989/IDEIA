import { Tutorial } from '../types';
import { primeiroProjetoTutorial } from './01-primeiro-projeto';
import { crudCompletoTutorial } from './02-crud-completo';
import { apiExternaTutorial } from './03-api-externa';
import { deployLocalTutorial } from './04-deploy-local';
import { novoAgenteTutorial } from './05-novo-agente';
import { contextPackCustomTutorial } from './06-context-pack-custom';

export const tutorialList: Tutorial[] = [
  primeiroProjetoTutorial,
  crudCompletoTutorial,
  apiExternaTutorial,
  deployLocalTutorial,
  novoAgenteTutorial,
  contextPackCustomTutorial
];

export {
  primeiroProjetoTutorial,
  crudCompletoTutorial,
  apiExternaTutorial,
  deployLocalTutorial,
  novoAgenteTutorial,
  contextPackCustomTutorial
};
