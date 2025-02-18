import { Search, X } from '@teable/icons';
import { LocalStorageKeys, useView } from '@teable/sdk';
import { useFields, useSearch } from '@teable/sdk/hooks';
import { cn, Popover, PopoverContent, PopoverTrigger, Button } from '@teable/ui-lib/shadcn';
import { isEqual } from 'lodash';
import { useTranslation } from 'next-i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDebounce, useLocalStorage } from 'react-use';
import { ToolBarButton } from '../tool-bar/ToolBarButton';
import { SearchCommand } from './SearchCommand';

export function SearchButton({
  className,
  textClassName,
}: {
  className?: string;
  textClassName?: string;
}) {
  const [active, setActive] = useState(false);
  const fields = useFields();
  const { fieldId, value, setFieldId, setValue } = useSearch();
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const { t } = useTranslation(['common', 'table']);
  const ref = useRef<HTMLInputElement>(null);
  const [enableGlobalSearch, setEnableGlobalSearch] = useLocalStorage(
    LocalStorageKeys.EnableGlobalSearch,
    false
  );
  const view = useView();

  useEffect(() => {
    if (!fieldId) {
      return;
    }
    const selectedField = fieldId.split(',');
    const hiddenFields: string[] = [];
    const columnMeta = view?.columnMeta || {};
    Object.entries(columnMeta).forEach(([key, value]) => {
      value?.hidden && hiddenFields.push(key);
    });
    const filteredFields = selectedField.filter((f) => !hiddenFields.includes(f));
    const primaryFieldId = fields.find((f) => f.isPrimary)?.id;
    if (!isEqual(filteredFields, selectedField)) {
      setFieldId(filteredFields.length > 0 ? filteredFields.join(',') : primaryFieldId);
    }
  }, [fieldId, fields, setFieldId, value, view?.columnMeta]);

  useHotkeys(
    `mod+f`,
    (e) => {
      setActive(true);
      ref.current?.focus();
      ref.current?.select();
      e.preventDefault();
    },
    {
      enableOnFormTags: ['input', 'select', 'textarea'],
    }
  );

  const [, cancel] = useDebounce(
    () => {
      setValue(inputValue);
    },
    500,
    [inputValue]
  );

  const resetSearch = useCallback(() => {
    cancel();
    setValue();
    setInputValue('');
  }, [cancel, setValue]);

  useHotkeys<HTMLInputElement>(
    `esc`,
    () => {
      if (isFocused) {
        resetSearch();
        setActive(false);
      }
    },
    {
      enableOnFormTags: ['input'],
    }
  );

  useEffect(() => {
    if (active) {
      ref.current?.focus();
      if (enableGlobalSearch) {
        setFieldId('all_fields');
        return;
      }
      if (fieldId === undefined) {
        setFieldId(fields[0].id);
      }
    }
  }, [active, enableGlobalSearch, fieldId, fields, ref, setFieldId]);

  const searchHeader = useMemo(() => {
    if (fieldId === 'all_fields') {
      return t('noun.global');
    }
    const fieldIds = fieldId?.split(',') || [];
    const fieldName = fields.find((f) => f.id === fieldIds[0])?.name;
    if (fieldIds.length === 1) {
      return t('table:view.search.field_one', { name: fieldName });
    }
    if (fieldIds.length > 1) {
      return t('table:view.search.field_other', { name: fieldName, length: fieldIds?.length });
    }
  }, [fieldId, fields, t]);

  return active ? (
    <div
      className={cn(
        'left-6 top-60 flex h-7 shrink-0 items-center gap-1 overflow-hidden rounded-xl bg-background p-0 pr-[7px] text-xs border outline-muted-foreground',
        {
          outline: isFocused,
        }
      )}
    >
      <Popover modal>
        <PopoverTrigger asChild>
          <Button variant="ghost" size={'xs'} className="max-w-40 truncate rounded-none border-r">
            <span className="truncate">{searchHeader}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1">
          <SearchCommand
            value={fieldId}
            onChange={(fieldIds) => {
              const ids = fieldIds.join(',');
              if (ids === 'all_fields') {
                setEnableGlobalSearch(true);
              } else {
                setEnableGlobalSearch(false);
              }
              setFieldId(ids);
            }}
          />
        </PopoverContent>
      </Popover>
      <input
        ref={ref}
        className="placeholder:text-muted-foregrounds flex w-32 rounded-md bg-transparent px-1 outline-none"
        placeholder={t('actions.search')}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        type="text"
        value={inputValue || ''}
        onChange={(e) => {
          setInputValue(e.target.value);
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
        onFocus={() => {
          setIsFocused(true);
        }}
      />
      <X
        className="hover:text-primary-foregrounds size-4 cursor-pointer font-light"
        onClick={() => {
          resetSearch();
          setActive(false);
        }}
      />
      <Search className="size-4" />
    </div>
  ) : (
    <ToolBarButton
      className={className}
      textClassName={textClassName}
      onClick={() => {
        setActive(true);
      }}
    >
      <Search className="size-4" />
    </ToolBarButton>
  );
}
