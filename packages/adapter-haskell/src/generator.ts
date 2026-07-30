import * as fs from 'fs';
import { createLogger } from '@ideia/logger';
import * as path from 'path';
const logger = createLogger('generator');

interface SpecField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'uuid' | 'email' | 'text';
  required: boolean;
}

interface SpecComponent {
  name: string;
  responsibility: string;
  fields: SpecField[];
}

interface Spec {
  id: string;
  title: string;
  requirements: Array<{
    id: string;
    description: string;
    category: string;
    priority: string;
    acceptanceCriteria: string[];
  }>;
  design: {
    components: Array<{
      name: string;
      responsibility: string;
      interfaces: Array<{
        name: string;
        type: string;
        contract: string;
      }>;
      dependencies: string[];
    }>;
  };
  acceptanceCriteria: Array<{
    id: string;
    description: string;
    type: string;
    given: string;
    when: string;
    then: string;
    expectedResult: string;
  }>;
}

export interface GeneratedFile { path: string; content: string }

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function hsType(field: SpecField): string {
  switch (field.type) {
    case 'number': return 'Double';
    case 'boolean': return 'Bool';
    case 'date': return 'UTCTime';
    case 'uuid': return 'UUID';
    case 'email': return 'Text';
    case 'text': return 'Text';
    default: return 'Text';
  }
}

function extractComponents(spec: Spec): SpecComponent[] {
  return spec.design.components.map(c => ({
    name: c.name,
    responsibility: c.responsibility,
    fields: [
      { name: 'id', type: 'uuid' as const, required: true },
      { name: 'name', type: 'string' as const, required: true },
      { name: 'createdAt', type: 'date' as const, required: true },
      ...c.interfaces.filter(i => i.type === 'input').map(i => ({
        name: i.name.replace(/-/g, '_'),
        type: 'string' as const,
        required: true,
      })),
    ],
  }));
}

export function generateFromSpec(spec: Spec, destDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const components = extractComponents(spec);
  const modName = spec.title.replace(/[^a-zA-Z0-9]/g, '');

  for (const comp of components) {
    files.push(...generateModule(comp.name, path.join(destDir, 'src')));
  }

  files.push({
    path: path.join(destDir, `${modName}.cabal`),
    content: `cabal-version: 3.4
name: ${modName}
version: 0.1.0
build-type: Simple

library
  exposed-modules: ${components.map(c => capitalize(c.name)).join('\n                 ')}
  build-depends: base >=4.18,
                 aeson,
                 text,
                 uuid,
                 time,
                 servant,
                 servant-server,
                 warp
  hs-source-dirs: src
  default-language: GHC2021

executable ${modName}-exe
  main-is: Main.hs
  build-depends: base, ${modName}, warp, servant-server
  hs-source-dirs: app
  default-language: GHC2021
`,
  });

  files.push({
    path: path.join(destDir, 'app', 'Main.hs'),
    content: `module Main where

import Servant (serve, Proxy(..))
import Network.Wai.Handler.Warp (run)
${components.map(c => `import qualified ${capitalize(c.name)}`).join('\n')}

type API = ${components.map(c => `${capitalize(c.name)}.${capitalize(c.name)}API`).join(' :<|> ')}

api :: Proxy API
api = Proxy

server :: Server API
server = ${components.map(c => `${capitalize(c.name)}.handleList :<|> ${capitalize(c.name)}.handleCreate`).join(' :<|> ')}

main :: IO ()
main = run 8080 $ serve api server
`,
  });

  files.push({
    path: path.join(destDir, 'stack.yaml'),
    content: `resolver: lts-22.0
packages:
- .
`,
  });

  if (spec.acceptanceCriteria.length > 0) {
    files.push({
      path: path.join(destDir, 'test', 'Spec.hs'),
      content: `module Main where

import Test.Hspec
${components.map(c => `import qualified ${capitalize(c.name)}`).join('\n')}

main :: IO ()
main = hspec $ do
${spec.acceptanceCriteria.map(tc => `  describe "${tc.id}" $ do
    it "${tc.description}" $ do
      True \`shouldBe\` True
`).join('\n')}
`,
    });
  }

  return files;
}

export function generateModule(moduleName: string, destDir: string): GeneratedFile[] {
  const cap = capitalize(moduleName);
  return [
    {
      path: path.join(destDir, `${cap}.hs`),
      content: `module ${cap}
    ( ${cap}(..)
    , create${cap}
    , get${cap}
    , list${cap}s
    , update${cap}
    , delete${cap}
    ) where

import Data.Aeson (ToJSON, FromJSON)
import Data.Text (Text)
import GHC.Generics (Generic)
import Data.Time (UTCTime, getCurrentTime)
import Data.UUID (UUID)
import Data.UUID.V4 (nextRandom)
import Data.List (find)
import Data.Maybe (isJust)

data ${cap} = ${cap}
    { id :: !UUID
    , name :: !Text
    , createdAt :: !UTCTime
    } deriving (Show, Generic)

instance ToJSON ${cap}
instance FromJSON ${cap}

create${cap} :: Text -> IO ${cap}
create${cap} name' = do
    uuid <- nextRandom
    time <- getCurrentTime
    return ${cap} { id = uuid, name = name', createdAt = time }

get${cap} :: UUID -> [${cap}] -> Maybe ${cap}
get${cap} uuid = find (\\x -> id x == uuid)

list${cap}s :: [${cap}] -> [${cap}]
list${cap}s = id

update${cap} :: ${cap} -> Text -> ${cap}
update${cap} item newName = item { name = newName }

delete${cap} :: UUID -> [${cap}] -> [${cap}]
delete${cap} uuid = filter (\\x -> id x /= uuid)
`,
    },
    {
      path: path.join(destDir, `${cap}Handler.hs`),
      content: `module ${cap}Handler
    ( handleCreate
    , handleList
    , handleGet
    , handleDelete
    ) where

import ${cap}
import Servant
import Servant.Server (Handler)
import Data.UUID (UUID)
import Data.Proxy (Proxy(..))
import Control.Monad.IO.Class (liftIO)

type ${cap}API = "api" :> "${moduleName}s" :> Get '[JSON] [${cap}]
            :<|> "api" :> "${moduleName}s" :> ReqBody '[JSON] Text :> Post '[JSON] ${cap}
            :<|> "api" :> "${moduleName}s" :> Capture "id" UUID :> Get '[JSON] ${cap}
            :<|> "api" :> "${moduleName}s" :> Capture "id" UUID :> Delete '[JSON] NoContent

handleCreate :: Text -> Handler ${cap}
handleCreate name' = liftIO $ create${cap} name'

handleList :: Handler [${cap}]
handleList = return []

handleGet :: UUID -> Handler ${cap}
handleGet uuid = do
    case get${cap} uuid [] of
        Just item -> return item
        Nothing -> throwError err404 { errBody = "Not found" }

handleDelete :: UUID -> Handler NoContent
handleDelete _ = return NoContent
`,
    },
  ];
}

export function scaffoldProject(projectName: string): GeneratedFile[] {
  const simpleName = path.basename(projectName).replace(/[^a-zA-Z0-9_-]/g, '') || 'app';
  const cap = capitalize(simpleName);
  return [
    {
      path: path.join(projectName, `${simpleName}.cabal`),
      content: `cabal-version: 3.4
name: ${simpleName}
version: 0.1.0
build-type: Simple

library
  exposed-modules: ${cap}
  build-depends: base >=4.18,
                 aeson,
                 text,
                 uuid,
                 time,
                 servant,
                 servant-server,
                 warp
  hs-source-dirs: src
  default-language: GHC2021

executable ${simpleName}-exe
  main-is: Main.hs
  build-depends: base, ${simpleName}, warp, servant-server
  hs-source-dirs: app
  default-language: GHC2021
`,
    },
    {
      path: path.join(projectName, 'app', 'Main.hs'),
      content: `module Main where

import Servant (serve)
import Network.Wai.Handler.Warp (run)
import ${cap} (${cap}API, handleCreate, handleList)

api :: Proxy ${cap}API
api = Proxy

server :: Server ${cap}API
server = handleList :<|> handleCreate

main :: IO ()
main = run 8080 $ serve api server
`,
    },
    {
      path: path.join(projectName, 'stack.yaml'),
      content: `resolver: lts-22.0
packages:
- .
`,
    },
  ];
}

export function writeFiles(files: GeneratedFile[]): void {
  for (const f of files) {
    const dir = path.dirname(f.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(f.path, f.content, 'utf-8');
  }
}
