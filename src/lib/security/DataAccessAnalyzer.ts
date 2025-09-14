/**
 * Data Access Analyzer - анализатор безопасности доступа к данным
 * Помогает выявить проблемы с доступом к чужим данным
 */

import { createComponentLogger } from '@/lib/debug/ConsoleManager';
import { supabase } from '@/integrations/supabase/client';

const logger = createComponentLogger('DataAccessAnalyzer');

interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  affectedData: string;
}

interface DataAccessReport {
  isSecure: boolean;
  issues: SecurityIssue[];
  checkedQueries: string[];
  recommendations: string[];
}

class DataAccessAnalyzer {
  private static instance: DataAccessAnalyzer;
  
  private constructor() {}

  static getInstance(): DataAccessAnalyzer {
    if (!DataAccessAnalyzer.instance) {
      DataAccessAnalyzer.instance = new DataAccessAnalyzer();
    }
    return DataAccessAnalyzer.instance;
  }

  /**
   * Анализирует безопасность публичного API
   */
  async analyzePublicDataAccess(): Promise<DataAccessReport> {
    const issues: SecurityIssue[] = [];
    const checkedQueries: string[] = [];
    
    try {
      // Тест 1: Проверяем функцию get_public_tracks_feed
      logger.debug('Testing get_public_tracks_feed security...');
      checkedQueries.push('get_public_tracks_feed');
      
      const { data: publicTracks, error } = await supabase
        .rpc('get_public_tracks_feed', { p_limit: 5 });
      
      if (error) {
        issues.push({
          severity: 'medium',
          description: 'Failed to access public tracks feed',
          recommendation: 'Check RLS policies on tracks table',
          affectedData: 'public tracks'
        });
      } else if (publicTracks && Array.isArray(publicTracks)) {
        // Проверяем содержит ли ответ чувствительные данные
        for (const track of publicTracks) {
          if (track.metadata && typeof track.metadata === 'object') {
            const metadata = track.metadata as any;
            
            // Проверяем на наличие чувствительных полей
            const sensitiveFields = ['user_id', 'private', 'internal', 'auth'];
            const foundSensitive = sensitiveFields.some(field => 
              JSON.stringify(metadata).toLowerCase().includes(field)
            );
            
            if (foundSensitive) {
              issues.push({
                severity: 'high',
                description: 'Public tracks contain potentially sensitive metadata',
                recommendation: 'Filter sensitive data in get_public_tracks_feed function',
                affectedData: `track metadata: ${track.id}`
              });
            }
          }
        }
      }

      // Тест 2: Проверяем доступ к приватным данным
      logger.debug('Testing private data access...');
      checkedQueries.push('tracks_table_direct_access');
      
      const { data: privateTracks, error: privateError } = await supabase
        .from('tracks')
        .select('id, title, metadata, is_public')
        .eq('is_public', false)
        .limit(1);

      if (!privateError && privateTracks && privateTracks.length > 0) {
        issues.push({
          severity: 'critical',
          description: 'Unauthorized access to private tracks detected',
          recommendation: 'Immediately review and fix RLS policies on tracks table',
          affectedData: 'private tracks'
        });
      }

      // Тест 3: Проверяем доступ к профилям других пользователей
      logger.debug('Testing user profiles access...');
      checkedQueries.push('user_profiles_cross_access');
      
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, user_id, telegram_id')
        .limit(10);

      if (!profilesError && profiles && profiles.length > 1) {
        // Если можем получить несколько профилей, это может быть проблемой
        const currentUserId = (await supabase.auth.getUser()).data.user?.id;
        const otherUserProfiles = profiles.filter(p => p.user_id !== currentUserId);
        
        if (otherUserProfiles.length > 0) {
          issues.push({
            severity: 'critical',
            description: 'Can access other users\' profile data',
            recommendation: 'User profiles RLS policies need immediate fixing',
            affectedData: 'user personal information'
          });
        }
      }

    } catch (error) {
      logger.error('Error during security analysis:', error);
      issues.push({
        severity: 'medium',
        description: 'Security analysis failed due to technical error',
        recommendation: 'Review database connection and permissions',
        affectedData: 'unknown'
      });
    }

    const recommendations = this.generateRecommendations(issues);
    const isSecure = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0;

    return {
      isSecure,
      issues,
      checkedQueries,
      recommendations
    };
  }

  /**
   * Генерирует рекомендации на основе найденных проблем
   */
  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations: string[] = [];
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    
    if (criticalIssues.length > 0) {
      recommendations.push('🚨 НЕМЕДЛЕННО: Критические проблемы безопасности требуют срочного исправления');
      recommendations.push('Проверьте RLS политики на всех таблицах с пользовательскими данными');
    }
    
    if (highIssues.length > 0) {
      recommendations.push('⚠️ ВЫСОКИЙ ПРИОРИТЕТ: Найдены серьезные проблемы безопасности');
      recommendations.push('Фильтруйте чувствительные данные в публичных API');
    }
    
    if (issues.length === 0) {
      recommendations.push('✅ Базовые проверки безопасности прошли успешно');
    }
    
    recommendations.push('Регулярно проводите аудит безопасности данных');
    
    return recommendations;
  }

  /**
   * Быстрая проверка безопасности
   */
  async quickSecurityCheck(): Promise<{ isSecure: boolean; message: string }> {
    try {
      const report = await this.analyzePublicDataAccess();
      const criticalCount = report.issues.filter(i => i.severity === 'critical').length;
      
      if (criticalCount > 0) {
        return {
          isSecure: false,
          message: `Найдено ${criticalCount} критических проблем безопасности`
        };
      }
      
      return {
        isSecure: true,
        message: 'Базовые проверки безопасности пройдены'
      };
    } catch (error) {
      return {
        isSecure: false,
        message: 'Ошибка при проверке безопасности'
      };
    }
  }
}

export const dataAccessAnalyzer = DataAccessAnalyzer.getInstance();