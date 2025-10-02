import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Mail, MessageCircle, User } from "lucide-react";

interface AccountInfo {
  type: 'email' | 'telegram';
  identifier: string;
  displayName?: string;
  metadata?: {
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

interface AccountMergeConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  sourceAccount: AccountInfo;
  targetAccount: AccountInfo;
  mergeDirection: 'telegram-to-email' | 'email-to-telegram';
}

export const AccountMergeConfirmation = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isLoading = false,
  sourceAccount,
  targetAccount,
  mergeDirection
}: AccountMergeConfirmationProps) => {
  
  const renderAccountCard = (account: AccountInfo, label: string) => (
    <div className="flex items-start space-x-3 p-4 bg-muted/50 rounded-lg border">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        account.type === 'telegram' ? 'bg-blue-500' : 'bg-primary'
      }`}>
        {account.type === 'telegram' ? (
          <MessageCircle className="h-5 w-5 text-white" />
        ) : (
          <Mail className="h-5 w-5 text-white" />
        )}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <Badge variant={account.type === 'telegram' ? 'default' : 'secondary'}>
            {account.type === 'telegram' ? 'Telegram' : 'Email'}
          </Badge>
        </div>
        <p className="font-medium">
          {account.displayName || account.identifier}
        </p>
        {account.metadata?.username && (
          <p className="text-sm text-muted-foreground">
            @{account.metadata.username}
          </p>
        )}
        {account.type === 'telegram' && account.metadata?.firstName && (
          <p className="text-sm text-muted-foreground">
            {account.metadata.firstName}
            {account.metadata.lastName && ` ${account.metadata.lastName}`}
          </p>
        )}
      </div>
    </div>
  );

  const getMergeDescription = () => {
    if (mergeDirection === 'telegram-to-email') {
      return {
        title: "Привязать Telegram к Email аккаунту?",
        description: "Вы хотите привязать Telegram аккаунт к существующему Email аккаунту. После привязки вы сможете входить обоими способами.",
        warning: "Все данные останутся в вашем Email аккаунте, а Telegram станет дополнительным способом входа."
      };
    } else {
      return {
        title: "Привязать Email к Telegram аккаунту?",
        description: "Вы хотите добавить Email и пароль к вашему Telegram аккаунту. После привязки вы сможете входить обоими способами.",
        warning: "Все данные останутся в вашем Telegram аккаунте, а Email станет дополнительным способом входа."
      };
    }
  };

  const mergeInfo = getMergeDescription();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mergeInfo.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {mergeInfo.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Source Account */}
          {renderAccountCard(
            mergeDirection === 'telegram-to-email' ? sourceAccount : targetAccount, 
            "Основной аккаунт"
          )}

          <div className="flex justify-center">
            <div className="text-2xl text-muted-foreground">→</div>
          </div>

          {/* Target Account */}
          {renderAccountCard(
            mergeDirection === 'telegram-to-email' ? targetAccount : sourceAccount, 
            "Будет привязан"
          )}

          <Separator />

          {/* Warning */}
          <Alert variant="default" className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              {mergeInfo.warning}
            </AlertDescription>
          </Alert>

          {/* Details */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium">После привязки:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Вы сможете входить через Telegram</li>
              <li>Вы сможете входить через Email и пароль</li>
              <li>Все ваши данные и настройки сохранятся</li>
              <li>Вы сможете отвязать аккаунты в любое время</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Привязываем..." : "Подтвердить привязку"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
