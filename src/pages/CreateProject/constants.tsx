import { StepProps } from 'antd';
import { getInputOptions, normFile } from 'components/FormItem/utils';
import { FormItemProps } from 'components/FormItem';
import { Validators } from './validate';
import { disabledDateBefore, disabledTimeBefore, integerNumberFormat, formatNumberParser } from './utils';
import { TSteps } from './types';
import { ITradingParCard } from './components/TradingPairList';
import { formatInputNumberString } from 'utils/calculate';
import { TIdoInfo } from './IDOInfo';
import { Rule } from 'antd/es/form';
import { LogoUploadTips, FeaturedUploadTips } from './components/uploadTips';
import React from 'react';
import { TokenType } from 'constants/misc';
import { elf, usdt } from 'assets/images/tokens';
import { Space } from 'antd';
import type { SelectProps } from 'antd';

export const stepTitle = ['Select Token', 'Describe Project', 'Customise Sale', 'Review & Transfer'];

export const stepsItems: StepProps[] = [
  {
    title: stepTitle[TSteps.ONE],
  },
  {
    title: stepTitle[TSteps.TWO],
  },
  {
    title: stepTitle[TSteps.THREE],
  },
  {
    title: stepTitle[TSteps.FOUR],
  },
];

export const currencyOptions: SelectProps['options'] = [
  {
    label: (
      <>
        <Space>
          <img src={elf} alt="" />
          {TokenType.ELF}
        </Space>
      </>
    ),
    value: TokenType.ELF,
  },
  {
    label: (
      <>
        <Space>
          <img src={usdt} alt="" />
          {TokenType.USDT}
        </Space>
      </>
    ),
    value: TokenType.USDT,
  },
];

const urlRule: Rule = { type: 'url', message: 'Please enter a valid link.' };

export const getProjectInfoFromJson = (isMobile: boolean): FormItemProps[] => {
  const textAreaMaxHeight = isMobile ? 'calc(100vh - 64px - 120px' : 'calc(100vh - 64px - 72px';
  const textAreaStyleMobile: React.CSSProperties = {
    height: textAreaMaxHeight,
    minHeight: 64,
    maxHeight: textAreaMaxHeight,
  };
  const autoSize = isMobile ? true : false;
  const textAreaStyle = isMobile ? textAreaStyleMobile : { height: 64 };

  return [
    getInputOptions({
      label: 'Project Name:',
      name: 'projectName',
      tooltip: 'The name of your project.',
      childrenProps: {
        maxLength: 40,
        showCount: true,
      },
    }),
    {
      type: 'textArea',
      label: 'Description (20-500 characters):',
      name: 'projectSummary',
      tooltip: 'A concise overview of your project, like its objectives, target audience, and unique advantages.',
      rules: [
        { required: true, message: 'Please enter the necessary information' },
        { min: 20, message: 'Please enter the necessary information' },
      ],
      childrenProps: {
        maxLength: 500,
        autoSize,
        style: textAreaStyle,
      },
    },
    {
      type: 'textArea',
      label: 'Project Details (300-20,000 characters):',
      name: 'projectDescription',
      tooltip:
        'An in-depth introduction to your project. You can highlight the issues it aims to tackle, the solutions it offers, the technologies involved, and the potential impact it may have, etc.',
      rules: [
        { required: true, message: 'Please enter the necessary information' },
        { min: 300, max: 20000, message: '300-20000' },
      ],
      childrenProps: {
        maxLength: 20000,
        autoSize,
        style: textAreaStyle,
      },
    },
    {
      type: 'fileUpload',
      label: 'Logo:',
      name: 'logoUrl',
      tooltip: 'The logo of your token that can represent your project.',
      required: true,
      valuePropName: 'fileList',
      className: 'form-upload',
      getValueFromEvent: normFile,
      childrenProps: {
        tips: <LogoUploadTips />,
        maxFileCount: 1,
        fileLimit: '10M',
        accept: '.jpg,.jpeg,.png',
      },
    },
    {
      type: 'fileUpload',
      label: 'Featured Images:',
      name: 'projectImgs',
      required: true,
      valuePropName: 'fileList',
      className: 'form-upload',
      tooltip: '3-5 additional images for promotional or branding purposes.',
      getValueFromEvent: normFile,
      childrenProps: {
        tips: <FeaturedUploadTips />,
        maxFileCount: 5,
        fileLimit: '10M',
        accept: '.jpg,.jpeg,.png',
      },
    },
    getInputOptions({
      label: 'Official Website:',
      name: 'website',
      tooltip: "The link to your project's official website.",
      rules: [
        {
          required: true,
          message: 'Please enter the necessary information',
        },
        urlRule,
      ],
    }),
    {
      type: 'fieldsGroup',
      label: 'Socials:',
      tooltip: "The links to your project's social media or communities.",
      fieldsList: [
        getInputOptions({
          label: 'Medium:',
          name: 'medium',
          required: false,
          rules: [urlRule],
        }),
        getInputOptions({
          label: 'X:',
          name: 'x',
          required: false,
          rules: [urlRule],
        }),
        getInputOptions({
          label: 'Telegram:',
          name: 'telegram',
          required: false,
          rules: [urlRule],
        }),
        getInputOptions({
          label: 'Github:',
          name: 'github',
          required: false,
          rules: [urlRule],
        }),
        getInputOptions({
          label: 'Discord:',
          name: 'discord',
          required: false,
          rules: [urlRule],
        }),
        getInputOptions({
          label: 'Reddit:',
          name: 'reddit',
          required: false,
          rules: [urlRule],
        }),
        getInputOptions({
          label: 'Facebook:',
          name: 'facebook',
          required: false,
          rules: [urlRule],
        }),
      ],
    },
  ];
};

export const formWhitelist: FormItemProps[] = [
  getInputOptions({
    label: 'Whitelist Tasks:',
    name: 'whitelistUrl',
    required: false,
    tooltip:
      'A list of tasks that users must complete in order to join the whitelist. Please provide a publicly accessible link that explains the associated tasks.',
    rules: [urlRule],
  }),
];

export const getIDOFormJson = (
  tradingCard?: ITradingParCard,
  idoInfo?: TIdoInfo,
  currency?: TokenType,
): FormItemProps[] => {
  return [
    {
      type: 'select',
      label: 'Sale type:',
      name: 'crowdFundingType',
      initialValue: 'Sell at the set price',
      required: true,
      tooltip: 'How the tokens will be sold. Currently the only type supported is the fixed price sale.',
      childrenProps: {
        disabled: true,
        list: [{ title: 'Fixed price', value: 'Sell at the set price' }],
      },
    },
    {
      type: 'select',
      label: 'Unsold Tokens:',
      name: 'isBurnRestToken',
      tooltip:
        'How unsold tokens will be handled. Currently the only means supported is to return unsold tokens to the project owner.',
      initialValue: '0',
      required: true,
      childrenProps: {
        disabled: true,
        list: [
          { title: 'Return', value: '0' },
          { title: 'Burn', value: '1' },
        ],
      },
    },
    {
      type: 'inlineField',
      label: 'Sale Price:',
      tooltip: `The token price relative to ${currency}. This defines the exchange rate, indicating the amount of ${currency} needed to buy a token.`,
      required: true,
      inlineFieldList: [
        {
          type: 'inputNumber',
          name: 'preSalePrice',
          rules: [
            (form: any) => ({
              validator: (rule, value) => Validators.preSalePrice(form, value),
            }),
          ],
          className: 'flex-1',
          childrenProps: {
            className: 'full-width',
            formatter: (value) => formatInputNumberString(value, 8),
            stringMode: true,
            controls: false,
            wheel: false,
          },
        },
        {
          type: 'pureText',
          childrenProps: {
            className: 'margin-left-8',
            text: tradingCard?.symbol ? `${tradingCard?.symbol} = 1 ${currency}` : '',
          },
        },
      ],
    },
    {
      type: 'inlineField',
      label: 'Total Amount for Sale:',
      tooltip: 'The total amount of tokens available for this sale.',
      required: true,
      inlineFieldList: [
        {
          type: 'inputNumber',
          name: 'crowdFundingIssueAmount',
          rules: [
            (form: any) => ({
              validator: (_, value) => Validators.crowdFundingIssueAmount(form, value),
            }),
          ],
          className: 'flex-1',
          childrenProps: {
            formatter: integerNumberFormat,
            parser: formatNumberParser,
            precision: 0,
            min: 0,
            className: 'full-width',
            controls: false,
            wheel: false,
          },
        },
        {
          type: 'pureText',
          childrenProps: {
            className: 'margin-left-8',
            text: tradingCard?.symbol ?? '',
          },
        },
      ],
    },
    {
      type: 'inlineField',
      label: 'Min & Max Allocation:',
      tooltip: 'The minimum and maximum allocation for individual users. ',
      required: true,
      inlineFieldList: [
        {
          type: 'inputNumber',
          name: 'minSubscription',
          className: 'flex-1',
          rules: [
            (form: any) => ({
              validator: (_, value) => Validators.minSubscription(form, value),
            }),
          ],
          childrenProps: {
            formatter: integerNumberFormat,
            parser: formatNumberParser,
            precision: 0,
            min: 0,
            controls: false,
            className: 'full-width',
            wheel: false,
          },
        },
        {
          type: 'pureText',
          childrenProps: {
            text: `${currency} To `,
            style: {
              flex: 'none',
              margin: '0 8px',
            },
          },
        },
        {
          type: 'inputNumber',
          name: 'maxSubscription',
          className: 'flex-1',
          rules: [
            (form: any) => ({
              validator: (_, value) => Validators.maxSubscription(form, value),
            }),
          ],
          childrenProps: {
            formatter: integerNumberFormat,
            parser: formatNumberParser,
            precision: 0,
            min: 1,
            controls: false,
            className: 'full-width',
            wheel: false,
          },
        },
        {
          type: 'pureText',
          childrenProps: {
            text: currency,
            style: {
              flex: 'none',
              marginLeft: 8,
            },
          },
        },
      ],
    },
    {
      type: 'datePicker',
      label: 'Sale Start Time:',
      name: 'startTime',
      required: true,
      rules: [{ required: true, message: 'please select start time' }],
      tooltip: 'The token sale will start at this time.',
      childrenProps: {
        pcProps: {
          showTime: true,
          showNow: false,
          placeholder: '',
          allowClear: false,
          disabledDate: disabledDateBefore,
          disabledTime: (current) => disabledTimeBefore(current),
        },
        mobileProps: {
          precision: 'second',
          min: () => new Date(),
        },
      },
    },
    {
      type: 'datePicker',
      label: 'Sale End Time:',
      tooltip: 'The token sale will end at this time.',
      name: 'endTime',
      required: true,
      rules: [{ required: true, message: 'please select end time' }],
      childrenProps: {
        disabled: !idoInfo?.startTime,
        pcProps: {
          showTime: true,
          showNow: false,
          placeholder: '',
          allowClear: false,
          disabledDate: (current) => disabledDateBefore(current, idoInfo?.endTime),
          disabledTime: (current) => disabledTimeBefore(current, idoInfo?.endTime),
        },
        mobileProps: {
          precision: 'second',
          min: () => new Date(idoInfo?.endTime || ''),
        },
      },
    },
    {
      type: 'datePicker',
      label: 'Token Distribution Time:',
      name: 'tokenReleaseTime',
      required: true,
      rules: [{ required: true, message: 'please select token distribution time' }],
      tooltip:
        'The time when tokens will be released to users, and you can receive proceeds along with any unsold tokens.',
      childrenProps: {
        disabled: !idoInfo?.startTime || !idoInfo?.endTime,
        pcProps: {
          showTime: true,
          showNow: false,
          placeholder: '',
          allowClear: false,
          disabledDate: (current) => disabledDateBefore(current, idoInfo?.tokenReleaseTime),
          disabledTime: (current) => disabledTimeBefore(current, idoInfo?.tokenReleaseTime),
        },
        mobileProps: {
          precision: 'second',
          min: () => new Date(idoInfo?.tokenReleaseTime || ''),
        },
      },
    },
    {
      type: 'group',
      label: 'Whitelist:',
      name: 'isEnableWhitelist',
      tooltip:
        'If whitelist is enabled, only whitelisted users are eligible to participate in the token sale. You can manually add users to the list.',
      initialValue: true,
      className: 'form-item-width-437',
      required: true,
      childrenProps: {
        radioList: [
          { value: true, children: 'Enable' },
          { value: false, children: 'Not Enable' },
        ],
      },
    },
  ];
};
