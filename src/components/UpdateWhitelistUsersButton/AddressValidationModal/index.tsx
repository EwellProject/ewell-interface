import { Flex } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Button, Typography, FontWeightEnum, Table, HashAddress } from 'aelf-design';
import { UpdateType } from '../types';
import './styles.less';
import { TWhitelistIdentifyItem, WhitelistAddressIdentifyStatusEnum } from 'utils/parseWhiteList';
import { useMemo } from 'react';
import clsx from 'clsx';
import CommonModalSwitchDrawer from 'components/CommonModalSwitchDrawer';
import { useScreenSize } from 'contexts/useStore/hooks';
import { ScreenSize } from 'constants/theme';

interface IAddressValidationModalProps {
  updateType: UpdateType;
  modalOpen: boolean;
  onModalCancel: () => void;
  onModalBack: () => void;
  onModalConfirm: () => void;
  validationData: TWhitelistIdentifyItem[];
}

const { Text, Title } = Typography;
const ACTIVE_LABEL = 'Addable';

const VALIDATION_STATUS_REASON_MAP = {
  [WhitelistAddressIdentifyStatusEnum.active]: '-',
  [WhitelistAddressIdentifyStatusEnum.exist]: 'Already Exist',
  [WhitelistAddressIdentifyStatusEnum.matchFail]: 'Match Fail',
  [WhitelistAddressIdentifyStatusEnum.notExist]: 'Not Exist',
  [WhitelistAddressIdentifyStatusEnum.repeat]: 'Duplicate Address',
};

const TABLE_HEADER_HEIGHT = 48;
const MODAL_TABLE_HEIGHT = 400;

export default function AddressValidationModal({
  updateType,
  modalOpen,
  onModalCancel,
  onModalBack,
  onModalConfirm,
  validationData,
}: IAddressValidationModalProps) {
  const screenSize = useScreenSize();
  const isSwitchDrawer = useMemo(() => screenSize === ScreenSize.MINI || screenSize === ScreenSize.SMALL, [screenSize]);

  const data = useMemo(
    () =>
      validationData.map((item, idx) => ({
        key: `${idx + 1}`,
        order: `${idx + 1}`,
        address: item.address,
        result: item.status === WhitelistAddressIdentifyStatusEnum.active ? 'Addable' : 'Not Addable',
        reason: VALIDATION_STATUS_REASON_MAP[item.status],
      })),
    [validationData],
  );

  const attemptsNum = useMemo(() => validationData.length, [validationData]);
  const addableNum = useMemo(
    () => validationData.filter((item) => item.status === WhitelistAddressIdentifyStatusEnum.active).length,
    [validationData],
  );
  const nonAddableNum = useMemo(() => attemptsNum - addableNum, [attemptsNum, addableNum]);

  const columns = useMemo(() => {
    let result: ColumnsType<any> = [];
    const baseColumns: ColumnsType<any> = [
      {
        title: 'No.',
        dataIndex: 'order',
        key: 'order',
      },
      {
        title: 'Address',
        dataIndex: 'address',
        key: 'address',
        render: (address) => (
          <HashAddress ignorePrefixSuffix={true} preLen={8} endLen={9} hasCopy={false} address={address} />
        ),
      },
    ];
    if (isSwitchDrawer) {
      result = baseColumns
        .map((item, index) => ({
          ...item,
          width: index === 0 ? '18%' : '50%',
        }))
        .concat({
          title: 'Results',
          dataIndex: 'result',
          key: 'result',
          width: '32%',
          render: (result, record) => (
            <Flex vertical>
              <Text size="mini" className={clsx(result !== ACTIVE_LABEL && 'error-text')}>
                {result || '-'}
              </Text>
              <Text size="mini">{record.reason || '-'}</Text>
            </Flex>
          ),
        });
    } else {
      result = baseColumns
        .map((item, index) => ({
          ...item,
          width: index === 0 ? 65 : 236,
        }))
        .concat(
          {
            title: 'Results',
            dataIndex: 'result',
            key: 'result',
            width: 151,
            render: (result) => <Text className={clsx(result !== ACTIVE_LABEL && 'error-text')}>{result || '-'}</Text>,
          },
          {
            title: 'Reason',
            dataIndex: 'reason',
            key: 'reason',
            width: 166,
            render: (reason) => <Text>{reason || '-'}</Text>,
          },
        );
    }
    return result;
  }, [isSwitchDrawer]);

  return (
    <CommonModalSwitchDrawer
      className="whitelist-users-address-validation"
      drawerClassName="whitelist-users-address-validation-drawer"
      title={`${updateType === UpdateType.ADD ? 'Add Allowlist' : 'Remove Whitelisted'} Users`}
      modalWidth={668}
      drawerHeight="100vh"
      open={modalOpen}
      onCancel={onModalCancel}>
      <Flex id="whitelist-users-address-validation-content" className="content-wrapper" vertical gap={24}>
        <Flex vertical gap={8}>
          <Title fontWeight={FontWeightEnum.Medium}>Address validation results</Title>
          <Flex className="info-wrapper" vertical>
            <Flex className="info-row" justify="space-between" align="flex-start" gap={16}>
              <Text>Total number of attempts to whitelist</Text>
              <Text fontWeight={FontWeightEnum.Medium}>{attemptsNum}</Text>
            </Flex>
            <Flex className="info-row" justify="space-between" align="flex-start" gap={16}>
              <Text>
                Total number of whitelist users that can be {updateType === UpdateType.ADD ? 'added' : 'removed'}
              </Text>
              <Text fontWeight={FontWeightEnum.Medium}>{addableNum}</Text>
            </Flex>
            <Flex className="info-row" justify="space-between" align="flex-start" gap={16}>
              <Text>
                Total number of non-{updateType === UpdateType.ADD ? 'addable' : 'removable'} whitelisted users
              </Text>
              <Text className="error-text" fontWeight={FontWeightEnum.Medium}>
                {nonAddableNum}
              </Text>
            </Flex>
          </Flex>
        </Flex>
        <div className="table-wrapper">
          <Table
            sticky
            scroll={{
              x: 'max-content',
              y: isSwitchDrawer ? '' : MODAL_TABLE_HEIGHT - TABLE_HEADER_HEIGHT,
            }}
            dataSource={data}
            columns={columns}
          />
        </div>
        <Flex className="footer-wrapper" gap={16} justify="center">
          <Button onClick={onModalBack}>Back</Button>
          <Button disabled={addableNum === 0} type="primary" onClick={onModalConfirm}>
            Confirmation
          </Button>
        </Flex>
      </Flex>
    </CommonModalSwitchDrawer>
  );
}
