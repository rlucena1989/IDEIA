module App
    ( App(..)
    , createApp
    , getApp
    , listApps
    ) where

import Data.Aeson (ToJSON, FromJSON, toJSON, parseJSON)
import Data.Text (Text)
import GHC.Generics (Generic)
import Data.Time (UTCTime, getCurrentTime)
import Data.UUID (UUID, nil)
import Data.UUID.V4 (nextRandom)

data App = App
    { id :: !UUID
    , name :: !Text
    , createdAt :: !UTCTime
    } deriving (Show, Generic)

instance ToJSON App
instance FromJSON App

createApp :: Text -> IO App
createApp name' = do
    uuid <- nextRandom
    time <- getCurrentTime
    return App { id = uuid, name = name', createdAt = time }

getApp :: UUID -> [App] -> Maybe App
getApp uuid = find (\x -> id x == uuid)

listApps :: [App] -> [App]
listApps = id
