{{- define "bank-rag.fullname" -}}
{{- if .Values.namespaceOverride -}}
{{- printf "%s-%s" .Release.Name .Values.namespaceOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
