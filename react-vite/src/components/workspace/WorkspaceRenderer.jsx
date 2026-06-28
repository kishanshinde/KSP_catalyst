// WorkspaceRenderer wraps DynamicWorkspace and provides the current workspace from ChatContext
import { useChat } from '../../context/ChatContext'
import DynamicWorkspace from './DynamicWorkspace'

export default function WorkspaceRenderer() {
  const { workspace } = useChat()
  return <DynamicWorkspace workspace={workspace} />
}
